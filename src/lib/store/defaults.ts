import type { FretboardSettings, KeyMapping, SessionLength, Settings } from "@/types";

/** Values are KeyboardEvent.code so mappings are layout-position based. */
export const DEFAULT_KEY_MAPPING: KeyMapping = {
  "left-thumb": "Space",
  "left-index": "KeyT",
  "left-middle": "KeyR",
  "left-ring": "KeyE",
  "left-pinky": "KeyW",
  "right-thumb": "Space",
  "right-index": "KeyU",
  "right-middle": "KeyI",
  "right-ring": "KeyO",
  "right-pinky": "KeyP",
};

export const DEFAULT_FRETBOARD: FretboardSettings = {
  tuningId: "standard",
  customOpenMidi: [40, 45, 50, 55, 59, 64],
  fretCount: 12,
  handedness: "right",
  accidentalPreference: "sharps",
  showOctaves: true,
  enabledStrings: [1, 2, 3, 4, 5, 6],
  minFret: 0,
  maxFret: 12,
};

export const DEFAULT_SETTINGS: Settings = {
  displayName: "",
  masterVolume: 0.8,
  metronomeVolume: 0.8,
  metronomeSound: "click",
  feedbackSounds: true,
  difficultyPreference: "adaptive",
  sessionLength: "standard",
  dailyGoalMinutes: 10,
  keyMapping: DEFAULT_KEY_MAPPING,
  audioInputDeviceId: "",
  instrument: "guitar",
  noteInputSource: "microphone",
  noiseGate: 0.01,
  latencyOffsetMs: 0,
  showTimingOffsets: true,
  showBeatFlash: true,
  reducedMotion: false,
  theme: "dark",
  showFingerHands: true,
  showFingerAnatomicalNames: false,
  fretboard: DEFAULT_FRETBOARD,
};

export const SESSION_LENGTHS: Record<
  SessionLength,
  {
    label: string;
    tempoBeats: number;
    guessRounds: number;
    fingerTrials: number;
    noteTrials: number;
    fretboardTrials: number;
    voiceTrials: number;
  }
> = {
  short: { label: "Short", tempoBeats: 24, guessRounds: 5, fingerTrials: 20, noteTrials: 8, fretboardTrials: 12, voiceTrials: 8 },
  standard: {
    label: "Standard",
    tempoBeats: 48,
    guessRounds: 8,
    fingerTrials: 40,
    noteTrials: 15,
    fretboardTrials: 20,
    voiceTrials: 12,
  },
  long: { label: "Long", tempoBeats: 96, guessRounds: 12, fingerTrials: 60, noteTrials: 25, fretboardTrials: 36, voiceTrials: 18 },
};

export const STORAGE_KEY = "riffony";
/** Previous localStorage key — migrated once into STORAGE_KEY. */
export const LEGACY_STORAGE_KEY = "musical-reflex";
