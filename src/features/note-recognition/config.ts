import type { Tier } from "@/types";
import { noteRange } from "@/lib/music/notes";
import { STANDARD_OPEN_MIDI } from "@/features/fretboard/engine/tuning";
import { lessonFor, poolMidis, type NoteMasteryMap } from "./progression";

/**
 * Legacy piano/voice ranges kept as a fallback when the instrument is not guitar.
 * Guitar training uses `lessonFor` + playable fret positions instead.
 */
export interface NoteTierConfig {
  from: string;
  to: string;
  naturalsOnly: boolean;
  showName: boolean;
  playReference: boolean;
  anyOctave: boolean;
  trialTimeoutMs: number;
}

export const NOTE_TIERS: Record<Tier, NoteTierConfig> = {
  0: {
    from: "E2",
    to: "E4",
    naturalsOnly: true,
    showName: true,
    playReference: true,
    anyOctave: false,
    trialTimeoutMs: 8000,
  },
  1: {
    from: "E2",
    to: "B4",
    naturalsOnly: true,
    showName: true,
    playReference: true,
    anyOctave: false,
    trialTimeoutMs: 6500,
  },
  2: {
    from: "E2",
    to: "E5",
    naturalsOnly: false,
    showName: true,
    playReference: false,
    anyOctave: false,
    trialTimeoutMs: 5500,
  },
  3: {
    from: "E2",
    to: "E5",
    naturalsOnly: false,
    showName: false,
    playReference: true,
    anyOctave: false,
    trialTimeoutMs: 4500,
  },
};

/** Piano / voice linear MIDI pool by tier. */
export function midisForTier(tier: Tier) {
  const c = NOTE_TIERS[tier];
  return noteRange(c.from, c.to, c.naturalsOnly);
}

/** Guitar: playable MIDI pool from tuning + progressive lesson. */
export function midisForGuitarLesson(
  tier: Tier,
  mastery: NoteMasteryMap,
  openMidi: readonly [number, number, number, number, number, number] = STANDARD_OPEN_MIDI,
) {
  const lesson = lessonFor(tier, mastery, openMidi);
  return poolMidis(openMidi, lesson.strings, lesson.maxFret, lesson.naturalsOnly);
}
