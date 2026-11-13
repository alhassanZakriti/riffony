import type { SessionRecord, Tier } from "@/types";
import {
  emptyVoiceProgress,
  VOICE_EXERCISE,
  VOICE_MODES,
  type VoiceMode,
  type VoiceModeStats,
  type VoiceProgress,
} from "./types";

const UNLOCK: { mode: VoiceMode; requires: VoiceMode | null; minSessions: number; minScore: number }[] = [
  { mode: "match", requires: null, minSessions: 0, minScore: 0 },
  { mode: "warmup", requires: "match", minSessions: 1, minScore: 50 },
  { mode: "stability", requires: "match", minSessions: 2, minScore: 60 },
  { mode: "intervals", requires: "match", minSessions: 3, minScore: 65 },
  { mode: "scales", requires: "intervals", minSessions: 2, minScore: 65 },
  { mode: "melody", requires: "match", minSessions: 4, minScore: 70 },
  { mode: "range", requires: "warmup", minSessions: 1, minScore: 50 },
];

function modeStats(progress: VoiceProgress, mode: VoiceMode): VoiceModeStats {
  return (
    progress.modes[mode] ?? {
      sessions: 0,
      bestScore: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      avgAbsCents: 0,
    }
  );
}

export function isModeUnlocked(progress: VoiceProgress, mode: VoiceMode): boolean {
  const rule = UNLOCK.find((u) => u.mode === mode);
  if (!rule) return false;
  if (!rule.requires) return true;
  const req = modeStats(progress, rule.requires);
  return req.sessions >= rule.minSessions && req.bestScore >= rule.minScore;
}

export function unlockedModes(progress: VoiceProgress): VoiceMode[] {
  return VOICE_MODES.filter((m) => isModeUnlocked(progress, m));
}

export function unlockHint(mode: VoiceMode): string {
  const rule = UNLOCK.find((u) => u.mode === mode);
  if (!rule || !rule.requires) return "Always available.";
  return `Complete ${rule.minSessions} ${rule.requires} session${rule.minSessions === 1 ? "" : "s"} with best score ≥${rule.minScore}.`;
}

export function recordVoiceSession(
  progress: VoiceProgress,
  mode: VoiceMode,
  score: number,
  correct: number,
  attempts: number,
  avgAbsCents: number,
  range?: { low: number; high: number },
): VoiceProgress {
  const prev = modeStats(progress, mode);
  const sessions = prev.sessions + 1;
  const next: VoiceProgress = {
    ...progress,
    modes: {
      ...progress.modes,
      [mode]: {
        sessions,
        bestScore: Math.max(prev.bestScore, score),
        totalCorrect: prev.totalCorrect + correct,
        totalAttempts: prev.totalAttempts + attempts,
        avgAbsCents:
          prev.sessions === 0 ? avgAbsCents : prev.avgAbsCents * 0.7 + avgAbsCents * 0.3,
      },
    },
  };
  if (range) {
    next.comfortableLowMidi =
      progress.comfortableLowMidi == null ? range.low : Math.min(progress.comfortableLowMidi, range.low);
    next.comfortableHighMidi =
      progress.comfortableHighMidi == null ? range.high : Math.max(progress.comfortableHighMidi, range.high);
    next.lastRangeAt = new Date().toISOString();
  }
  return next;
}

export function voiceOverview(sessions: SessionRecord[], progress: VoiceProgress) {
  const voice = sessions.filter((s) => s.category === "voice");
  const match = voice.filter((s) => s.exercise === "voice-match");
  const accuracy = match.length
    ? match.reduce((a, s) => a + s.accuracy, 0) / match.length
    : null;
  const stability = voice
    .filter((s) => s.exercise === "voice-stability")
    .map((s) => s.stats.stability ?? null)
    .filter((v): v is number => v != null);
  const intervals = voice.filter((s) => s.exercise === "voice-intervals");
  return {
    sessions: voice.length,
    pitchAccuracy: accuracy,
    pitchStability: stability.length ? stability.reduce((a, b) => a + b, 0) / stability.length : null,
    intervalAccuracy: intervals.length
      ? intervals.reduce((a, s) => a + s.accuracy, 0) / intervals.length
      : null,
    low: progress.comfortableLowMidi,
    high: progress.comfortableHighMidi,
    unlocked: unlockedModes(progress),
  };
}

export function recommendVoiceMode(progress: VoiceProgress): { mode: VoiceMode; reason: string } {
  const unlocked = unlockedModes(progress);
  for (const mode of unlocked) {
    const s = modeStats(progress, mode);
    if (s.sessions === 0) {
      return { mode, reason: `You haven’t tried ${mode} yet — a strong next step.` };
    }
  }
  let weakest: VoiceMode = "match";
  let worst = 101;
  for (const mode of unlocked) {
    const s = modeStats(progress, mode);
    if (s.bestScore < worst) {
      worst = s.bestScore;
      weakest = mode;
    }
  }
  return {
    mode: weakest,
    reason: `Your weakest unlocked voice area is currently around score ${Math.round(worst)}.`,
  };
}

export function ensureVoiceProgress(p?: VoiceProgress | null): VoiceProgress {
  return p ? { ...emptyVoiceProgress(), ...p, modes: { ...p.modes } } : emptyVoiceProgress();
}

export { VOICE_EXERCISE };

export function highestVoiceTier(sessions: SessionRecord[]): Tier {
  // Reuse category unlock via sessions scored under voice-* exercises.
  let tier: Tier = 0;
  const voice = sessions.filter((s) => s.category === "voice");
  const qualify = (t: Tier) =>
    voice.filter((s) => s.tier === t && s.score >= 80 && s.accuracy >= 0.85).length >= 2;
  while (tier < 3 && qualify(tier)) tier = (tier + 1) as Tier;
  return tier;
}
