export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
export const NATURAL_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;

export interface NoteInfo {
  midi: number;
  name: string;
  pitchClass: string;
  octave: number;
  frequency: number;
}

export function midiToFrequency(midi: number, a4 = A4_FREQUENCY) {
  return a4 * 2 ** ((midi - A4_MIDI) / 12);
}

/** Continuous (fractional) MIDI number for a frequency. */
export function frequencyToMidiFloat(frequency: number, a4 = A4_FREQUENCY) {
  return A4_MIDI + 12 * Math.log2(frequency / a4);
}

export function midiToNote(midi: number): NoteInfo {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return {
    midi,
    pitchClass: NOTE_NAMES[pc],
    octave,
    name: `${NOTE_NAMES[pc]}${octave}`,
    frequency: midiToFrequency(midi),
  };
}

export interface FrequencyAnalysis {
  note: NoteInfo;
  /** Deviation from the nearest equal-tempered note, -50..+50 cents. */
  cents: number;
}

export function analyzeFrequency(frequency: number): FrequencyAnalysis {
  const m = frequencyToMidiFloat(frequency);
  const nearest = Math.round(m);
  return { note: midiToNote(nearest), cents: (m - nearest) * 100 };
}

/** Signed cents between a frequency and a target MIDI note (may exceed ±50). */
export function centsFromTarget(frequency: number, targetMidi: number) {
  return (frequencyToMidiFloat(frequency) - targetMidi) * 100;
}

export function parseNoteName(name: string): number {
  const match = /^([A-G])([#♯b♭]?)(-?\d)$/.exec(name.trim());
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[match[1]];
  if (match[2] === "#" || match[2] === "♯") pc += 1;
  if (match[2] === "b" || match[2] === "♭") pc -= 1;
  return (Number(match[3]) + 1) * 12 + pc;
}

export function noteRange(from: string, to: string, naturalsOnly: boolean) {
  const start = parseNoteName(from);
  const end = parseNoteName(to);
  const out: number[] = [];
  for (let m = start; m <= end; m++) {
    if (!naturalsOnly || NATURAL_PITCH_CLASSES.includes(((m % 12) + 12) % 12)) out.push(m);
  }
  return out;
}
