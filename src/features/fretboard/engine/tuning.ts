import type { TuningId } from "@/types";
import type { GuitarString, TuningDefinition } from "../types";

/**
 * Open-string MIDI notes, guitar numbering:
 * index 0 = string 6 (lowest), index 5 = string 1 (highest).
 */
export const STANDARD_OPEN_MIDI: [number, number, number, number, number, number] = [40, 45, 50, 55, 59, 64];

export const TUNINGS: Record<Exclude<TuningId, "custom">, TuningDefinition> = {
  standard: {
    id: "standard",
    label: "Standard",
    description: "E A D G B E",
    openMidi: [40, 45, 50, 55, 59, 64],
  },
  "drop-d": {
    id: "drop-d",
    label: "Drop D",
    description: "D A D G B E",
    openMidi: [38, 45, 50, 55, 59, 64],
  },
  "half-step-down": {
    id: "half-step-down",
    label: "Half-step down",
    description: "E♭ A♭ D♭ G♭ B♭ E♭",
    openMidi: [39, 44, 49, 54, 58, 63],
  },
  "d-standard": {
    id: "d-standard",
    label: "D standard",
    description: "D G C F A D",
    openMidi: [38, 43, 48, 53, 57, 62],
  },
  "open-g": {
    id: "open-g",
    label: "Open G",
    description: "D G D G B D",
    openMidi: [38, 43, 50, 55, 59, 62],
  },
};

export function resolveOpenMidi(
  tuningId: TuningId,
  custom?: [number, number, number, number, number, number],
): [number, number, number, number, number, number] {
  if (tuningId === "custom") return custom ?? [...STANDARD_OPEN_MIDI];
  return [...TUNINGS[tuningId].openMidi];
}

/** Map guitar string number (1–6) to openMidi array index (0 = string 6). */
export function openMidiIndex(string: GuitarString) {
  return 6 - string;
}

export function openMidiForString(
  string: GuitarString,
  openMidi: readonly [number, number, number, number, number, number],
) {
  return openMidi[openMidiIndex(string)];
}

export const STRING_LABELS: Record<GuitarString, string> = {
  6: "Low E",
  5: "A",
  4: "D",
  3: "G",
  2: "B",
  1: "High E",
};

export const ALL_STRINGS: GuitarString[] = [6, 5, 4, 3, 2, 1];
