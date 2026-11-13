"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Category, ExerciseId, SessionRecord, Settings, Tier } from "@/types";
import { ACHIEVEMENTS, type Achievement } from "@/features/gamification/achievements";
import { dailyPuzzleXp, type DailyPuzzleAttempt } from "@/features/daily-puzzle/types";
import { computeStreak, bestScore } from "@/features/gamification/stats";
import { computeXp, levelFromXp } from "@/features/gamification/xp";
import type { PositionMastery } from "@/features/fretboard/types";
import type { NoteMasteryMap } from "@/features/note-recognition/progression";
import { emptyVoiceProgress, type VoiceProgress } from "@/features/voice-training/types";
import { dayKey, mean, uid } from "@/lib/utils";
import { DEFAULT_FRETBOARD, DEFAULT_SETTINGS, LEGACY_STORAGE_KEY, STORAGE_KEY } from "./defaults";

function migrateLegacyLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

migrateLegacyLocalStorage();

export type SessionDraft = Omit<SessionRecord, "id" | "xp" | "xpBreakdown" | "previousBest">;

export interface RecordOutcome {
  record: SessionRecord;
  newAchievements: Achievement[];
  levelBefore: number;
  levelAfter: number;
}

interface PersistedState {
  settings: Settings;
  sessions: SessionRecord[];
  achievements: Record<string, string>;
  onboarded: Record<Category, boolean>;
  lastTier: Partial<Record<ExerciseId, Tier>>;
  sidebarCollapsed: boolean;
  /** Per string-fret spaced-repetition state for Learn Fretboard. */
  fretboardMastery: Record<string, PositionMastery>;
  /** Per-string mastery for Note Recognition (guitar progression). */
  noteStringMastery: NoteMasteryMap;
  /** Voice Training progress (range estimate + per-mode stats). */
  voiceProgress: VoiceProgress;
  /** UTC date key → first completed daily puzzle attempt. */
  dailyPuzzleAttempts: Record<string, DailyPuzzleAttempt>;
  /** Local profile created via /register (no cloud auth yet). */
  localProfileCreatedAt: string | null;
}

interface StoreState extends PersistedState {
  hydrated: boolean;
  /** True while an exercise is running; hides navigation. Not persisted. */
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleSidebar: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateFretboardSettings: (patch: Partial<Settings["fretboard"]>) => void;
  setFretboardMastery: (map: Record<string, PositionMastery>) => void;
  setNoteStringMastery: (map: NoteMasteryMap) => void;
  setVoiceProgress: (progress: VoiceProgress) => void;
  recordSession: (draft: SessionDraft) => RecordOutcome;
  deleteSession: (id: string) => SessionRecord | undefined;
  restoreSession: (record: SessionRecord) => void;
  resetProgress: () => PersistedState;
  restoreSnapshot: (snapshot: PersistedState) => void;
  setOnboarded: (category: Category, value: boolean) => void;
  setLastTier: (exercise: ExerciseId, tier: Tier) => void;
  createLocalProfile: (displayName: string) => void;
  /**
   * Saves the first attempt for a puzzle date. Replays return the stored attempt
   * without awarding XP again.
   */
  recordDailyPuzzle: (
    attempt: Omit<DailyPuzzleAttempt, "xpAwarded" | "completedAt" | "xp"> & { completedAt?: string },
  ) => {
    attempt: DailyPuzzleAttempt;
    isNew: boolean;
    xpAwarded: number;
  };
}

const emptyOnboarded = (): Record<Category, boolean> => ({
  tempo: false,
  fingers: false,
  notes: false,
  fretboard: false,
  voice: false,
});

export const totalXp = (
  sessions: SessionRecord[],
  dailyPuzzleAttempts: Record<string, DailyPuzzleAttempt> = {},
) =>
  sessions.reduce((s, r) => s + r.xp, 0) +
  Object.values(dailyPuzzleAttempts).reduce((s, a) => s + (a.xpAwarded ? a.xp : 0), 0);

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      sessions: [],
      achievements: {},
      onboarded: emptyOnboarded(),
      lastTier: {},
      sidebarCollapsed: false,
      fretboardMastery: {},
      noteStringMastery: {},
      voiceProgress: emptyVoiceProgress(),
      dailyPuzzleAttempts: {},
      localProfileCreatedAt: null,
      hydrated: false,
      focusMode: false,
      setFocusMode: (v) => set({ focusMode: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      createLocalProfile: (displayName) =>
        set((s) => ({
          localProfileCreatedAt: s.localProfileCreatedAt ?? new Date().toISOString(),
          settings: { ...s.settings, displayName: displayName.trim().slice(0, 40) },
        })),

      recordDailyPuzzle: (draft) => {
        const existing = get().dailyPuzzleAttempts[draft.date];
        if (existing) {
          return { attempt: existing, isNew: false, xpAwarded: 0 };
        }
        const xp = dailyPuzzleXp(draft.score);
        const attempt: DailyPuzzleAttempt = {
          ...draft,
          completedAt: draft.completedAt ?? new Date().toISOString(),
          xpAwarded: true,
          xp,
        };
        set((s) => ({
          dailyPuzzleAttempts: { ...s.dailyPuzzleAttempts, [draft.date]: attempt },
        }));
        return { attempt, isNew: true, xpAwarded: xp };
      },

      updateFretboardSettings: (patch) =>
        set((s) => ({
          settings: { ...s.settings, fretboard: { ...s.settings.fretboard, ...patch } },
        })),

      setFretboardMastery: (map) => set({ fretboardMastery: map }),
      setNoteStringMastery: (map) => set({ noteStringMastery: map }),
      setVoiceProgress: (progress) => set({ voiceProgress: progress }),

      recordSession: (draft) => {
        const { sessions, achievements } = get();
        const sameExercise = sessions.filter((s) => s.exercise === draft.exercise);
        const previousBest = bestScore(sessions, draft.exercise);
        const recentAverage = sameExercise.length ? mean(sameExercise.slice(-5).map((s) => s.score)) : null;
        const firstSessionToday = !sessions.some((s) => dayKey(s.startedAt) === dayKey(draft.startedAt));

        const provisional: SessionRecord = { ...draft, id: uid(), xp: 0, xpBreakdown: [], previousBest };
        const nextSessions = [...sessions, provisional];
        const streakDays = computeStreak(nextSessions);
        const newAchievements = ACHIEVEMENTS.filter(
          (a) => !achievements[a.id] && a.check({ sessions: nextSessions, latest: provisional, fretboardMastery: get().fretboardMastery }),
        );

        const xp = computeXp({
          score: draft.score,
          tier: draft.tier,
          perfect: draft.perfect,
          isPersonalBest: previousBest != null && draft.score > previousBest,
          recentAverage,
          firstSessionToday,
          streakDays,
          achievementXp: newAchievements.reduce((s, a) => s + a.xp, 0),
        });
        const record: SessionRecord = { ...provisional, xp: xp.total, xpBreakdown: xp.breakdown };
        const now = new Date().toISOString();

        const attempts = get().dailyPuzzleAttempts;
        const levelBefore = levelFromXp(totalXp(sessions, attempts)).level;
        set({
          sessions: [...sessions, record],
          achievements: { ...achievements, ...Object.fromEntries(newAchievements.map((a) => [a.id, now])) },
        });
        return {
          record,
          newAchievements,
          levelBefore,
          levelAfter: levelFromXp(totalXp(get().sessions, get().dailyPuzzleAttempts)).level,
        };
      },

      deleteSession: (id) => {
        const record = get().sessions.find((s) => s.id === id);
        set((s) => ({ sessions: s.sessions.filter((r) => r.id !== id) }));
        return record;
      },

      restoreSession: (record) =>
        set((s) => ({
          sessions: [...s.sessions, record].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
        })),

      resetProgress: () => {
        const {
          settings,
          sessions,
          achievements,
          onboarded,
          lastTier,
          sidebarCollapsed,
          fretboardMastery,
          noteStringMastery,
          voiceProgress,
          dailyPuzzleAttempts,
          localProfileCreatedAt,
        } = get();
        const snapshot = {
          settings,
          sessions,
          achievements,
          onboarded,
          lastTier,
          sidebarCollapsed,
          fretboardMastery,
          noteStringMastery,
          voiceProgress,
          dailyPuzzleAttempts,
          localProfileCreatedAt,
        };
        set({
          sessions: [],
          achievements: {},
          onboarded: emptyOnboarded(),
          lastTier: {},
          fretboardMastery: {},
          noteStringMastery: {},
          voiceProgress: emptyVoiceProgress(),
          dailyPuzzleAttempts: {},
        });
        return snapshot;
      },

      restoreSnapshot: (snapshot) => set({ ...snapshot }),

      setOnboarded: (category, value) => set((s) => ({ onboarded: { ...s.onboarded, [category]: value } })),

      setLastTier: (exercise, tier) => set((s) => ({ lastTier: { ...s.lastTier, [exercise]: tier } })),
    }),
    {
      name: STORAGE_KEY,
      version: 5,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({
        settings,
        sessions,
        achievements,
        onboarded,
        lastTier,
        sidebarCollapsed,
        fretboardMastery,
        noteStringMastery,
        voiceProgress,
        dailyPuzzleAttempts,
        localProfileCreatedAt,
      }) => ({
        settings,
        sessions,
        achievements,
        onboarded,
        lastTier,
        sidebarCollapsed,
        fretboardMastery,
        noteStringMastery,
        voiceProgress,
        dailyPuzzleAttempts,
        localProfileCreatedAt,
      }),
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<PersistedState> & { settings?: Partial<Settings> };
        return {
          ...p,
          onboarded: { ...emptyOnboarded(), ...p.onboarded },
          fretboardMastery: p.fretboardMastery ?? {},
          noteStringMastery: p.noteStringMastery ?? {},
          voiceProgress: p.voiceProgress ?? emptyVoiceProgress(),
          dailyPuzzleAttempts: p.dailyPuzzleAttempts ?? {},
          localProfileCreatedAt: p.localProfileCreatedAt ?? null,
          settings: {
            ...DEFAULT_SETTINGS,
            ...p.settings,
            keyMapping: { ...DEFAULT_SETTINGS.keyMapping, ...p.settings?.keyMapping },
            fretboard: { ...DEFAULT_FRETBOARD, ...p.settings?.fretboard },
          },
        };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...p,
          onboarded: { ...emptyOnboarded(), ...p.onboarded },
          fretboardMastery: p.fretboardMastery ?? {},
          noteStringMastery: p.noteStringMastery ?? {},
          voiceProgress: p.voiceProgress ?? emptyVoiceProgress(),
          dailyPuzzleAttempts: p.dailyPuzzleAttempts ?? {},
          localProfileCreatedAt: p.localProfileCreatedAt ?? null,
          settings: {
            ...DEFAULT_SETTINGS,
            ...p.settings,
            keyMapping: { ...DEFAULT_SETTINGS.keyMapping, ...p.settings?.keyMapping },
            fretboard: { ...DEFAULT_FRETBOARD, ...p.settings?.fretboard },
          },
        };
      },
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);

export const useSettings = () => useAppStore((s) => s.settings);
