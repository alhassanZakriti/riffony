import type { Tier } from "@/types";

export type VoiceMode =
  | "match"
  | "range"
  | "intervals"
  | "scales"
  | "stability"
  | "warmup"
  | "melody";

export const VOICE_MODES: VoiceMode[] = [
  "match",
  "warmup",
  "stability",
  "intervals",
  "scales",
  "melody",
  "range",
];

export const VOICE_MODE_LABEL: Record<VoiceMode, string> = {
  match: "Pitch Matching",
  range: "Vocal Range",
  intervals: "Interval Training",
  scales: "Scale Training",
  stability: "Pitch Stability",
  warmup: "Vocal Warm-ups",
  melody: "Melodic Memory",
};

export const VOICE_MODE_BLURB: Record<VoiceMode, string> = {
  match: "Hear a tone, then sing it back with octave-accurate pitch.",
  range: "Gently map comfortable low and high notes — never force.",
  intervals: "Sing ascending and descending intervals from a root.",
  scales: "Sing scale degrees in sequence with progressive keys.",
  stability: "Hold a pitch steadily within a soft tolerance band.",
  warmup: "Short, gentle humming, sirens, and vowel patterns.",
  melody: "Listen to a short phrase, then reproduce it from memory.",
};

export const VOICE_EXERCISE: Record<VoiceMode, import("@/types").ExerciseId> = {
  match: "voice-match",
  range: "voice-range",
  intervals: "voice-intervals",
  scales: "voice-scales",
  stability: "voice-stability",
  warmup: "voice-warmup",
  melody: "voice-melody",
};

export interface VoiceModeStats {
  sessions: number;
  bestScore: number;
  totalCorrect: number;
  totalAttempts: number;
  avgAbsCents: number;
}

export interface VoiceProgress {
  /** Estimated comfortable range (MIDI). Null until range exploration records data. */
  comfortableLowMidi: number | null;
  comfortableHighMidi: number | null;
  lastRangeAt: string | null;
  modes: Partial<Record<VoiceMode, VoiceModeStats>>;
}

export function emptyVoiceProgress(): VoiceProgress {
  return {
    comfortableLowMidi: null,
    comfortableHighMidi: null,
    lastRangeAt: null,
    modes: {},
  };
}

export interface VoiceLessonHints {
  showTargetName: boolean;
  allowReplay: boolean;
  matchCents: number;
  trialTimeoutMs: number;
}

export function voiceHintsForTier(tier: Tier): VoiceLessonHints {
  return {
    showTargetName: tier <= 1,
    allowReplay: tier <= 2,
    matchCents: tier === 0 ? 45 : tier === 1 ? 35 : tier === 2 ? 25 : 18,
    trialTimeoutMs: tier === 0 ? 9000 : tier === 1 ? 7500 : tier === 2 ? 6000 : 5000,
  };
}
