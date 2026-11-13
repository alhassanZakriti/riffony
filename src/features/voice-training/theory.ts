import type { Tier } from "@/types";
import { midiToNote, NATURAL_PITCH_CLASSES } from "@/lib/music/notes";
import { pick } from "@/lib/utils";

/** Comfortable default mid-range seed (A3) — not gender-based. */
export const VOICE_SEED_MIDI = 57;

export const INTERVALS_BY_TIER: Record<Tier, { semitones: number; label: string }[]> = {
  0: [
    { semitones: 0, label: "Unison" },
    { semitones: 1, label: "Minor 2nd" },
    { semitones: 2, label: "Major 2nd" },
    { semitones: 3, label: "Minor 3rd" },
    { semitones: 4, label: "Major 3rd" },
  ],
  1: [
    { semitones: 5, label: "Perfect 4th" },
    { semitones: 6, label: "Tritone" },
    { semitones: 7, label: "Perfect 5th" },
    { semitones: 8, label: "Minor 6th" },
    { semitones: 9, label: "Major 6th" },
  ],
  2: [
    { semitones: 10, label: "Minor 7th" },
    { semitones: 11, label: "Major 7th" },
    { semitones: 12, label: "Octave" },
  ],
  3: [
    { semitones: 7, label: "Perfect 5th" },
    { semitones: 9, label: "Major 6th" },
    { semitones: 12, label: "Octave" },
    { semitones: 14, label: "Ninth" },
    { semitones: 16, label: "Major 10th" },
  ],
};

export type ScaleId = "major" | "natural-minor" | "harmonic-minor" | "major-pent" | "minor-pent" | "blues";

export const SCALE_STEPS: Record<ScaleId, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10, 12],
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11, 12],
  "major-pent": [0, 2, 4, 7, 9, 12],
  "minor-pent": [0, 3, 5, 7, 10, 12],
  blues: [0, 3, 5, 6, 7, 10, 12],
};

export const SCALE_LABEL: Record<ScaleId, string> = {
  major: "Major",
  "natural-minor": "Natural minor",
  "harmonic-minor": "Harmonic minor",
  "major-pent": "Major pentatonic",
  "minor-pent": "Minor pentatonic",
  blues: "Blues",
};

export function scalesForTier(tier: Tier): ScaleId[] {
  if (tier === 0) return ["major", "natural-minor"];
  if (tier === 1) return ["major", "natural-minor", "major-pent", "minor-pent"];
  if (tier === 2) return ["major", "natural-minor", "harmonic-minor", "major-pent", "minor-pent", "blues"];
  return ["major", "natural-minor", "harmonic-minor", "major-pent", "minor-pent", "blues"];
}

/** Clamp a MIDI into a comfortable practice band, never forcing extremes. */
export function clampComfortable(
  midi: number,
  low: number | null,
  high: number | null,
  fallbackLow = 48,
  fallbackHigh = 69,
) {
  const lo = low ?? fallbackLow;
  const hi = high ?? fallbackHigh;
  return Math.min(hi, Math.max(lo, midi));
}

export function poolMatchMidis(tier: Tier, low: number | null, high: number | null) {
  const lo = low ?? (tier === 0 ? 52 : 48);
  const hi = high ?? (tier === 0 ? 64 : tier === 1 ? 69 : 72);
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) {
    if (tier <= 1 && !NATURAL_PITCH_CLASSES.includes(((m % 12) + 12) % 12)) continue;
    out.push(m);
  }
  return out.length ? out : [VOICE_SEED_MIDI];
}

export function pickRoot(tier: Tier, low: number | null, high: number | null) {
  return pick(poolMatchMidis(tier, low, high));
}

export function midiLabel(midi: number) {
  return midiToNote(midi).name;
}

export function centsBetween(targetMidi: number, detectedMidi: number, detectedCents = 0) {
  // Distance from equal-tempered target, including fine cents of detection.
  return (detectedMidi - targetMidi) * 100 + detectedCents;
}

export function withinCents(absCents: number, tolerance: number) {
  return absCents <= tolerance;
}
