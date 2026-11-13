export type Category = "tempo" | "fingers" | "notes" | "fretboard" | "voice";

export type ExerciseId =
  | "tempo-maintain"
  | "tempo-guess"
  | "fingers"
  | "notes"
  | "fretboard"
  | "voice-match"
  | "voice-range"
  | "voice-intervals"
  | "voice-scales"
  | "voice-stability"
  | "voice-warmup"
  | "voice-melody";

/** 0 Beginner · 1 Intermediate · 2 Advanced · 3 Expert */
export type Tier = 0 | 1 | 2 | 3;

export type Hand = "left" | "right";
export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";
export type FingerId = `${Hand}-${FingerName}`;

export type KeyMapping = Record<FingerId, string>;

export interface ScoreComponent {
  id: string;
  label: string;
  /** 0..1 */
  value: number;
  /** Relative weight; components are normalised by the sum of weights. */
  weight: number;
  /** Plain-language explanation shown in the breakdown. */
  detail: string;
}

export interface ScoreResult {
  /** 0..100, rounded to one decimal. */
  score: number;
  components: ScoreComponent[];
}

export interface SessionMetric {
  label: string;
  value: string;
  /** Optional numeric value used for comparisons and charts. */
  raw?: number;
}

export interface SessionRecord {
  id: string;
  exercise: ExerciseId;
  category: Category;
  tier: Tier;
  startedAt: string;
  durationMs: number;
  score: number;
  /** 0..1 */
  accuracy: number;
  avgReactionMs: number | null;
  bestReactionMs: number | null;
  correct: number;
  errors: number;
  breakdown: ScoreComponent[];
  /** Exercise-specific numeric metrics for analytics, e.g. timing deviation. */
  stats: Record<string, number>;
  /** Human-readable configuration summary, e.g. "100 BPM · Eighths". */
  configLabel: string;
  perfect: boolean;
  xp: number;
  xpBreakdown: { label: string; amount: number }[];
  previousBest: number | null;
}

export type ThemePreference = "dark" | "light" | "system";
export type MetronomeSound = "click" | "woodblock" | "beep" | "soft";
export type SessionLength = "short" | "standard" | "long";
export type DifficultyPreference = "adaptive" | "manual";
export type InstrumentId = "piano" | "guitar" | "voice";
export type NoteInputSource = "microphone" | "midi";
export type AccidentalPreference = "sharps" | "flats";
export type FretboardHandedness = "right" | "left";
export type TuningId = "standard" | "drop-d" | "half-step-down" | "d-standard" | "open-g" | "custom";

export interface FretboardSettings {
  tuningId: TuningId;
  /** Open-string MIDI notes from string 6 (low) to string 1 (high). Used when tuningId is custom. */
  customOpenMidi: [number, number, number, number, number, number];
  fretCount: 12 | 15 | 17 | 21 | 24;
  handedness: FretboardHandedness;
  accidentalPreference: AccidentalPreference;
  showOctaves: boolean;
  /** Strings enabled for practice, guitar numbering (1 = high E … 6 = low E). */
  enabledStrings: number[];
  minFret: number;
  maxFret: number;
}

export interface Settings {
  displayName: string;
  masterVolume: number;
  metronomeVolume: number;
  metronomeSound: MetronomeSound;
  feedbackSounds: boolean;
  difficultyPreference: DifficultyPreference;
  sessionLength: SessionLength;
  dailyGoalMinutes: number;
  keyMapping: KeyMapping;
  audioInputDeviceId: string;
  instrument: InstrumentId;
  noteInputSource: NoteInputSource;
  /** RMS level below which microphone input is treated as silence. */
  noiseGate: number;
  /** Added to tap timestamps to compensate for device latency (ms). */
  latencyOffsetMs: number;
  showTimingOffsets: boolean;
  showBeatFlash: boolean;
  reducedMotion: boolean;
  theme: ThemePreference;
  /** Finger Training: show SVG hand illustrations. */
  showFingerHands: boolean;
  /** Finger Training: force anatomical names even at higher tiers. */
  showFingerAnatomicalNames: boolean;
  fretboard: FretboardSettings;
}
