import type { AccidentalPreference } from "@/types";

/** Guitar string number: 1 = high E … 6 = low E. */
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

export type MasteryState = "new" | "learning" | "practicing" | "reviewing" | "mastered";

export type FretboardMode =
  | "identify"
  | "find"
  | "find-all"
  | "octave"
  | "challenge"
  | "play";

export type CurriculumStage = 1 | 2 | 3 | 4 | 5 | 6;

export interface FretPosition {
  string: GuitarString;
  fret: number;
}

export type PositionKey = `${GuitarString}-${number}`;

export function positionKey(p: FretPosition): PositionKey {
  return `${p.string}-${p.fret}`;
}

export function parsePositionKey(key: PositionKey): FretPosition {
  const [s, f] = key.split("-");
  return { string: Number(s) as GuitarString, fret: Number(f) };
}

export interface PositionMastery {
  key: PositionKey;
  attempts: number;
  correct: number;
  incorrect: number;
  /** Running average response time for correct answers (ms). */
  avgReactionMs: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  state: MasteryState;
  /** SM-2 style ease factor (min 1.3). */
  ease: number;
  /** Current review interval in days. */
  intervalDays: number;
  /** ISO date when this position is next due. */
  nextReviewAt: string | null;
  /** Consecutive successful recalls in a row. */
  streak: number;
}

export interface FretboardNote {
  midi: number;
  pitchClass: number;
  /** Display name respecting sharp/flat preference (no octave). */
  name: string;
  /** Full name with octave, e.g. F♯3 */
  fullName: string;
  octave: number;
  frequency: number;
}

export interface TuningDefinition {
  id: string;
  label: string;
  description: string;
  /** Open MIDI from string 6 → 1. */
  openMidi: [number, number, number, number, number, number];
}

export type QuestionKind =
  | "identify"
  | "find"
  | "find-all"
  | "octave"
  | "challenge-identify"
  | "challenge-find"
  | "challenge-octave"
  | "play";

export interface IdentifyQuestion {
  kind: "identify" | "challenge-identify";
  prompt: string;
  target: FretPosition;
  choices: string[];
  correctName: string;
}

export interface FindQuestion {
  kind: "find" | "challenge-find";
  prompt: string;
  /** Pitch class 0–11. */
  pitchClass: number;
  noteName: string;
  /** When set, answer must be on this string. */
  requiredString: GuitarString | null;
  /** All valid positions in the active range. */
  valid: FretPosition[];
  /** How many distinct correct clicks are required (1 for find-any). */
  requiredCount: number;
}

export interface FindAllQuestion {
  kind: "find-all";
  prompt: string;
  pitchClass: number;
  noteName: string;
  valid: FretPosition[];
}

export interface OctaveQuestion {
  kind: "octave" | "challenge-octave";
  prompt: string;
  reference: FretPosition;
  /** Valid octave targets (typically +12 semitones on a shape). */
  valid: FretPosition[];
  explanation: string;
}

export interface PlayQuestion {
  kind: "play";
  prompt: string;
  target: FretPosition;
  targetMidi: number;
  noteName: string;
}

export type FretboardQuestion =
  | IdentifyQuestion
  | FindQuestion
  | FindAllQuestion
  | OctaveQuestion
  | PlayQuestion;

export interface TrialResult {
  question: FretboardQuestion;
  correct: boolean;
  reactionMs: number | null;
  usedHint: boolean;
  /** Positions involved in the answer for mastery updates. */
  positions: FretPosition[];
}

export interface AccidentalOpts {
  preference: AccidentalPreference;
}
