import { midiToFrequency, midiToNote } from "@/lib/music/notes";
import type { AccidentalPreference } from "@/types";
import type { FretboardNote, FretPosition, GuitarString } from "../types";
import { openMidiForString } from "./tuning";

const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] as const;

export function pitchClassName(pc: number, preference: AccidentalPreference = "sharps") {
  const i = ((pc % 12) + 12) % 12;
  return preference === "flats" ? FLAT_NAMES[i] : SHARP_NAMES[i];
}

export function normalizePitchClassName(name: string): number {
  const n = name.trim().replace(/#/g, "♯").replace(/b/g, "♭");
  const match = /^([A-Ga-g])([♯♭]?)$/.exec(n);
  if (!match) throw new Error(`Unknown pitch class: ${name}`);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[match[1].toUpperCase()];
  if (match[2] === "♯") pc += 1;
  if (match[2] === "♭") pc -= 1;
  return ((pc % 12) + 12) % 12;
}

/** True when two pitch-class names refer to the same semitone (C♯ ≡ D♭). */
export function enharmonicEqual(a: string, b: string) {
  return normalizePitchClassName(a) === normalizePitchClassName(b);
}

export function midiAtPosition(
  string: GuitarString,
  fret: number,
  openMidi: readonly [number, number, number, number, number, number],
) {
  if (fret < 0) throw new Error(`Invalid fret: ${fret}`);
  return openMidiForString(string, openMidi) + fret;
}

export function noteAtPosition(
  string: GuitarString,
  fret: number,
  openMidi: readonly [number, number, number, number, number, number],
  preference: AccidentalPreference = "sharps",
): FretboardNote {
  const midi = midiAtPosition(string, fret, openMidi);
  const info = midiToNote(midi);
  const pc = ((midi % 12) + 12) % 12;
  const name = pitchClassName(pc, preference);
  return {
    midi,
    pitchClass: pc,
    name,
    fullName: `${name}${info.octave}`,
    octave: info.octave,
    frequency: midiToFrequency(midi),
  };
}

export function noteAt(
  pos: FretPosition,
  openMidi: readonly [number, number, number, number, number, number],
  preference: AccidentalPreference = "sharps",
) {
  return noteAtPosition(pos.string, pos.fret, openMidi, preference);
}

/** All positions in range whose pitch class matches. */
export function findPositions(
  pitchClass: number,
  openMidi: readonly [number, number, number, number, number, number],
  opts: {
    strings?: GuitarString[];
    minFret?: number;
    maxFret?: number;
  } = {},
): FretPosition[] {
  const strings = opts.strings ?? ([6, 5, 4, 3, 2, 1] as GuitarString[]);
  const minFret = opts.minFret ?? 0;
  const maxFret = opts.maxFret ?? 12;
  const target = ((pitchClass % 12) + 12) % 12;
  const out: FretPosition[] = [];
  for (const string of strings) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      const midi = midiAtPosition(string, fret, openMidi);
      if (((midi % 12) + 12) % 12 === target) out.push({ string, fret });
    }
  }
  return out;
}

/**
 * Classic guitar octave shapes from a reference position.
 * Accounts for the G→B major-third vs other perfect-fourth string intervals.
 */
export function octaveShapeTargets(ref: FretPosition, maxFret: number) {
  const shapes: { stringDelta: number; fretDelta: number; label: string }[] = [];
  const towardTreble = (ref.string - 2) as number;
  if (towardTreble >= 1) {
    // Crossing the G(3)–B(2) interval requires +3 frets; otherwise +2.
    const crossesGB = ref.string >= 3 && towardTreble <= 2;
    shapes.push({
      stringDelta: -2,
      fretDelta: crossesGB ? 3 : 2,
      label: crossesGB
        ? "Two strings higher, three frets up (G–B exception)"
        : "Two strings higher, two frets up",
    });
  }
  shapes.push({ stringDelta: 0, fretDelta: 12, label: "Same string, 12th-fret octave" });

  const out: { target: FretPosition; label: string; fretDelta: number }[] = [];
  for (const s of shapes) {
    const string = (ref.string + s.stringDelta) as GuitarString;
    const fret = ref.fret + s.fretDelta;
    if (string < 1 || string > 6) continue;
    if (fret < 0 || fret > maxFret) continue;
    out.push({ target: { string, fret }, label: s.label, fretDelta: s.fretDelta });
  }
  return out;
}

export function positionsEqual(a: FretPosition, b: FretPosition) {
  return a.string === b.string && a.fret === b.fret;
}

export function includesPosition(list: FretPosition[], p: FretPosition) {
  return list.some((x) => positionsEqual(x, p));
}
