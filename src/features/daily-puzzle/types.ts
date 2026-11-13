export type PuzzleKind =
  | "note-recognition"
  | "rhythm-recognition"
  | "tempo-challenge"
  | "fretboard-challenge"
  | "musical-memory"
  | "ear-training";

export type PuzzleDifficulty = "easy" | "medium" | "hard";

export interface PuzzleMeta {
  date: string;
  kind: PuzzleKind;
  difficulty: PuzzleDifficulty;
  title: string;
  description: string;
  estimatedSeconds: number;
}

/** Public payload — never includes the correct answer. */
export interface PublicPuzzle extends PuzzleMeta {
  prompt: string;
  /** UI payload specific to the puzzle kind. */
  content: PuzzleContent;
}

export type PuzzleContent =
  | {
      kind: "note-recognition";
      midi: number;
      /** Display mode for the prompt (audio plays client-side). */
      revealMode: "staff" | "play";
      choices: string[];
    }
  | {
      kind: "rhythm-recognition";
      /** Beats to audition (durations in quarter-note units). Not labeled. */
      playBeats: number[];
      choices: { id: string; label: string }[];
    }
  | {
      kind: "tempo-challenge";
      /** Needed for metronome playback; not shown in the UI. */
      playBpm: number;
      clickCount: number;
      subdivision: "quarter";
      bpmChoices: number[];
    }
  | {
      kind: "fretboard-challenge";
      string: 1 | 2 | 3 | 4 | 5 | 6;
      fret: number;
      mode: "identify";
      choices: string[];
    }
  | {
      kind: "musical-memory";
      sequenceLabels: string[];
      choices: string[][];
    }
  | {
      kind: "ear-training";
      midiA: number;
      midiB: number;
      mode: "same-or-different";
      choices: ["Same", "Different"];
    };

export type PuzzleAnswer =
  | { kind: "note-recognition"; choice: string }
  | { kind: "rhythm-recognition"; choiceId: string }
  | { kind: "tempo-challenge"; bpm: number }
  | { kind: "fretboard-challenge"; choice: string }
  | { kind: "musical-memory"; choiceIndex: number }
  | { kind: "ear-training"; choice: "Same" | "Different" };

export interface PuzzleResult {
  date: string;
  kind: PuzzleKind;
  correct: boolean;
  score: number;
  rating: "Perfect" | "Great" | "Good" | "Keep practicing";
  explanation: string;
  /** Human-readable correct answer, revealed only after submit. */
  correctLabel: string;
  submittedLabel: string;
}

export interface DailyPuzzleAttempt {
  date: string;
  kind: PuzzleKind;
  score: number;
  correct: boolean;
  rating: PuzzleResult["rating"];
  explanation: string;
  correctLabel: string;
  submittedLabel: string;
  completedAt: string;
  /** True once XP was awarded for this date (prevents refresh farming). */
  xpAwarded: boolean;
  /** XP granted for the first completion only. */
  xp: number;
}

export function dailyPuzzleXp(score: number) {
  return Math.round(12 + score * 0.18);
}

export const PUZZLE_KIND_LABEL: Record<PuzzleKind, string> = {
  "note-recognition": "Note Recognition",
  "rhythm-recognition": "Rhythm Recognition",
  "tempo-challenge": "Tempo Challenge",
  "fretboard-challenge": "Fretboard Challenge",
  "musical-memory": "Musical Memory",
  "ear-training": "Ear Training",
};

export const DIFFICULTY_LABEL: Record<PuzzleDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
