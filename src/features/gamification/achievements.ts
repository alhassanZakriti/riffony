import type { SessionRecord } from "@/types";
import type { PositionMastery } from "@/features/fretboard/types";
import { countMastered } from "@/features/fretboard/engine/mastery";
import { computeStreak, overview } from "./stats";

export interface AchievementContext {
  sessions: SessionRecord[];
  latest: SessionRecord;
  fretboardMastery?: Record<string, PositionMastery>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xp: number;
  check: (ctx: AchievementContext) => boolean;
}

function openStringCorrect(sessions: SessionRecord[]) {
  return sessions.filter((s) => s.exercise === "fretboard").reduce((n, s) => n + (s.stats.openStringCorrect ?? 0), 0);
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-session",
    title: "First Steps",
    description: "Complete your first training session.",
    xp: 10,
    check: ({ sessions }) => sessions.length >= 1,
  },
  {
    id: "first-perfect",
    title: "First Perfect Session",
    description: "Finish a session with no mistakes or misses (tempo: every hit Great or better).",
    xp: 40,
    check: ({ latest }) => latest.perfect,
  },
  {
    id: "hundred-correct",
    title: "100 Correct Responses",
    description: "Accumulate 100 correct responses across all modules.",
    xp: 30,
    check: ({ sessions }) => overview(sessions).totalCorrect >= 100,
  },
  {
    id: "thousand-correct",
    title: "1,000 Correct Responses",
    description: "Accumulate 1,000 correct responses across all modules.",
    xp: 80,
    check: ({ sessions }) => overview(sessions).totalCorrect >= 1000,
  },
  {
    id: "tempo-master",
    title: "Tempo Master",
    description: "Score 90 or more in Maintain the Tempo at Expert level.",
    xp: 100,
    check: ({ latest }) => latest.exercise === "tempo-maintain" && latest.tier === 3 && latest.score >= 90,
  },
  {
    id: "golden-ear",
    title: "Golden Ear",
    description: "Guess five tempos in one session, each within 3%.",
    xp: 40,
    check: ({ latest }) =>
      latest.exercise === "tempo-guess" && (latest.stats.rounds ?? 0) >= 5 && (latest.stats.preciseRounds ?? 0) === latest.stats.rounds,
  },
  {
    id: "finger-independence",
    title: "Finger Independence",
    description: "Reach 95% accuracy in Random Finger mode at Advanced level or higher.",
    xp: 60,
    check: ({ latest }) =>
      latest.exercise === "fingers" && latest.tier >= 2 && latest.stats.mode === 1 && latest.accuracy >= 0.95,
  },
  {
    id: "lightning",
    title: "Lightning Fingers",
    description: "Average under 350 ms with at least 90% accuracy in a finger session.",
    xp: 50,
    check: ({ latest }) =>
      latest.exercise === "fingers" && latest.accuracy >= 0.9 && (latest.avgReactionMs ?? Infinity) < 350,
  },
  {
    id: "perfect-pitch-round",
    title: "Perfect Pitch Round",
    description:
      "Exercise achievement: identify every note in an Ear-only Note Recognition session at Intermediate or higher. Not a claim of absolute pitch.",
    xp: 80,
    check: ({ latest }) =>
      latest.exercise === "notes" && latest.tier >= 1 && latest.stats.earOnly === 1 && latest.accuracy === 1,
  },
  {
    id: "open-string-explorer",
    title: "Open String Explorer",
    description: "Correctly identify open strings 12 times in Learn Fretboard.",
    xp: 25,
    check: ({ sessions }) => openStringCorrect(sessions) >= 12,
  },
  {
    id: "low-e-master",
    title: "Low E Master",
    description: "Master at least 10 positions on the low E string.",
    xp: 40,
    check: ({ fretboardMastery }) =>
      Object.values(fretboardMastery ?? {}).filter((m) => m.key.startsWith("6-") && m.state === "mastered").length >= 10,
  },
  {
    id: "a-string-master",
    title: "A String Master",
    description: "Master at least 10 positions on the A string.",
    xp: 40,
    check: ({ fretboardMastery }) =>
      Object.values(fretboardMastery ?? {}).filter((m) => m.key.startsWith("5-") && m.state === "mastered").length >= 10,
  },
  {
    id: "first-50-notes",
    title: "First 50 Notes",
    description: "Accumulate 50 correct fretboard answers.",
    xp: 35,
    check: ({ sessions }) =>
      sessions.filter((s) => s.exercise === "fretboard").reduce((n, s) => n + s.correct, 0) >= 50,
  },
  {
    id: "full-neck-explorer",
    title: "Full Neck Explorer",
    description: "Practice at least one position on every string in a single fretboard session.",
    xp: 45,
    check: ({ latest }) => latest.exercise === "fretboard" && (latest.stats.stringsTouched ?? 0) >= 6,
  },
  {
    id: "octave-finder",
    title: "Octave Finder",
    description: "Score 90+ in an Octave Training session.",
    xp: 50,
    check: ({ latest }) => latest.exercise === "fretboard" && latest.stats.mode === 3 && latest.score >= 90,
  },
  {
    id: "fretboard-specialist",
    title: "Fretboard Specialist",
    description: "Master 40 fretboard positions.",
    xp: 80,
    check: ({ fretboardMastery }) => countMastered(fretboardMastery ?? {}) >= 40,
  },
  {
    id: "full-fretboard-master",
    title: "Full Fretboard Master",
    description: "Master 72 positions across the first 12 frets (all six strings).",
    xp: 150,
    check: ({ fretboardMastery }) => countMastered(fretboardMastery ?? {}) >= 72,
  },
  {
    id: "streak-3",
    title: "Three-Day Streak",
    description: "Train on three consecutive days.",
    xp: 20,
    check: ({ sessions }) => computeStreak(sessions) >= 3,
  },
  {
    id: "streak-7",
    title: "Seven-Day Streak",
    description: "Train on seven consecutive days.",
    xp: 60,
    check: ({ sessions }) => computeStreak(sessions) >= 7,
  },
  {
    id: "personal-record",
    title: "Personal Record",
    description: "Beat your previous best score in any exercise.",
    xp: 15,
    check: ({ latest }) => latest.previousBest != null && latest.score > latest.previousBest,
  },
  {
    id: "hour",
    title: "Dedicated Hour",
    description: "Accumulate one hour of total training time.",
    xp: 40,
    check: ({ sessions }) => overview(sessions).totalMs >= 3_600_000,
  },
  {
    id: "first-note-sung",
    title: "First Note",
    description: "Complete your first pitch-matching voice session.",
    xp: 20,
    check: ({ sessions }) => sessions.some((s) => s.exercise === "voice-match"),
  },
  {
    id: "perfect-match-voice",
    title: "Perfect Match",
    description: "Match every note in a pitch-matching session within the precision window.",
    xp: 45,
    check: ({ latest }) => latest.exercise === "voice-match" && latest.perfect && latest.correct >= 6,
  },
  {
    id: "interval-explorer",
    title: "Interval Explorer",
    description: "Complete an interval training session.",
    xp: 25,
    check: ({ sessions }) => sessions.some((s) => s.exercise === "voice-intervals"),
  },
  {
    id: "scale-runner",
    title: "Scale Runner",
    description: "Complete a scale training session.",
    xp: 25,
    check: ({ sessions }) => sessions.some((s) => s.exercise === "voice-scales"),
  },
  {
    id: "steady-voice",
    title: "Steady Voice",
    description: "Finish a pitch-stability session with at least 70% time on target.",
    xp: 35,
    check: ({ latest }) => latest.exercise === "voice-stability" && (latest.stats.stability ?? 0) >= 0.7,
  },
  {
    id: "melodic-memory",
    title: "Melodic Memory",
    description: "Complete a melodic memory voice session.",
    xp: 30,
    check: ({ sessions }) => sessions.some((s) => s.exercise === "voice-melody"),
  },
  {
    id: "vocal-routine",
    title: "Vocal Routine",
    description: "Complete five voice-training sessions.",
    xp: 40,
    check: ({ sessions }) => sessions.filter((s) => s.category === "voice").length >= 5,
  },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
