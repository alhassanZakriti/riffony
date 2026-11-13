import type { Tier } from "@/types";

export type Subdivision = "quarter" | "eighth" | "triplet";

export const SUBDIVISION_LABEL: Record<Subdivision, string> = {
  quarter: "Quarters",
  eighth: "Eighths",
  triplet: "Triplets",
};

export const SUBDIVISION_FACTOR: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  triplet: 3,
};

export const BPM_OPTIONS = [60, 80, 100, 120, 140] as const;

export interface TempoTierConfig {
  bpms: number[];
  subdivisions: Subdivision[];
  /** Count-in beats before scoring starts. */
  countIn: number;
  /** Hide continuous visual pulse after the count-in. */
  hideVisualGuide: boolean;
  patterns: GuessPatternId[];
}

export type GuessPatternId = "straight" | "kick-snare" | "hat-groove" | "syncopated";

export const GUESS_PATTERN_LABEL: Record<GuessPatternId, string> = {
  straight: "Straight pulse",
  "kick-snare": "Kick & snare",
  "hat-groove": "Hat groove",
  syncopated: "Syncopated",
};

export const TEMPO_TIERS: Record<Tier, TempoTierConfig> = {
  0: {
    bpms: [60, 80, 100],
    subdivisions: ["quarter"],
    countIn: 4,
    hideVisualGuide: false,
    patterns: ["straight", "kick-snare"],
  },
  1: {
    bpms: [60, 80, 100, 120],
    subdivisions: ["quarter", "eighth"],
    countIn: 4,
    hideVisualGuide: false,
    patterns: ["straight", "kick-snare", "hat-groove"],
  },
  2: {
    bpms: [80, 100, 120, 140],
    subdivisions: ["quarter", "eighth", "triplet"],
    countIn: 2,
    hideVisualGuide: true,
    patterns: ["kick-snare", "hat-groove", "syncopated"],
  },
  3: {
    bpms: [100, 120, 140],
    subdivisions: ["eighth", "triplet"],
    countIn: 2,
    hideVisualGuide: true,
    patterns: ["hat-groove", "syncopated"],
  },
};

export function intervalMs(bpm: number, subdivision: Subdivision) {
  return 60_000 / (bpm * SUBDIVISION_FACTOR[subdivision]);
}
