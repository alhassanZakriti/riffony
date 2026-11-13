import { midiToNote, NOTE_NAMES, NATURAL_PITCH_CLASSES } from "@/lib/music/notes";
import { noteAt } from "@/features/fretboard/engine/note-calculator";
import { TUNINGS } from "@/features/fretboard/engine/tuning";
import type { GuitarString } from "@/features/fretboard/types";
import { puzzleDayKey } from "./date";
import { pickIndex, seededRng, shuffleInPlace } from "./rng";
import type {
  PuzzleAnswer,
  PuzzleDifficulty,
  PuzzleKind,
  PuzzleResult,
  PublicPuzzle,
} from "./types";

const KINDS: PuzzleKind[] = [
  "note-recognition",
  "rhythm-recognition",
  "tempo-challenge",
  "fretboard-challenge",
  "musical-memory",
  "ear-training",
];

const RHYTHM_PATTERNS = [
  { id: "quarters", label: "Four quarter notes", beats: [1, 1, 1, 1] },
  { id: "eighths", label: "Eight eighth notes", beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
  { id: "syncopa", label: "Syncopated (rest on 2)", beats: [1, 0, 1, 1] },
  { id: "dotted", label: "Dotted quarter + eighth ×2", beats: [1.5, 0.5, 1.5, 0.5] },
  { id: "gallop", label: "Gallop (eighth–16th–16th)", beats: [0.5, 0.25, 0.25, 0.5, 0.25, 0.25] },
] as const;

const TEMPO_POOL = [60, 72, 80, 88, 96, 100, 108, 120, 128, 140] as const;

const OPEN_MIDI = TUNINGS.standard.openMidi;

interface InternalPuzzle {
  public: PublicPuzzle;
  /** Secret used only on the server for grading. */
  secret: {
    kind: PuzzleKind;
    answer: string | number;
    explanation: string;
    correctLabel: string;
  };
}

function difficultyFor(dayIndex: number): PuzzleDifficulty {
  const r = dayIndex % 5;
  if (r <= 1) return "easy";
  if (r <= 3) return "medium";
  return "hard";
}

function dayIndex(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function naturalNames(count: number, include: string, rng: () => number) {
  const pool = NATURAL_PITCH_CLASSES.map((pc) => NOTE_NAMES[pc].replace("♯", "#"));
  // Use simple letter names without accidentals for naturals
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const set = new Set<string>([include]);
  while (set.size < count) set.add(letters[pickIndex(rng, letters.length)]);
  return shuffleInPlace([...set], rng);
}

function pitchClassName(midi: number) {
  return midiToNote(midi).pitchClass.replace("♯", "#");
}

function buildNoteRecognition(date: string, rng: () => number, difficulty: PuzzleDifficulty): InternalPuzzle {
  const octave = difficulty === "hard" ? 3 + pickIndex(rng, 3) : 4;
  const pc = NATURAL_PITCH_CLASSES[pickIndex(rng, NATURAL_PITCH_CLASSES.length)];
  const midi = (octave + 1) * 12 + pc;
  const answer = pitchClassName(midi).replace("♯", "#");
  const choices = naturalNames(difficulty === "easy" ? 3 : 4, answer, rng);
  return {
    public: {
      date,
      kind: "note-recognition",
      difficulty,
      title: "Name that note",
      description: "Hear or see a note, then choose its pitch class.",
      estimatedSeconds: 45,
      prompt: "What is the name of this note?",
      content: {
        kind: "note-recognition",
        midi,
        revealMode: difficulty === "easy" ? "staff" : "play",
        choices,
      },
    },
    secret: {
      kind: "note-recognition",
      answer,
      correctLabel: answer,
      explanation: `${midiToNote(midi).name} is pitch class ${answer}. On a piano it’s the white key for ${answer} in octave ${octave}.`,
    },
  };
}

function buildRhythm(date: string, rng: () => number, difficulty: PuzzleDifficulty): InternalPuzzle {
  const idx = pickIndex(rng, RHYTHM_PATTERNS.length);
  const correct = RHYTHM_PATTERNS[idx];
  const choiceCount = difficulty === "easy" ? 3 : 4;
  const pool = RHYTHM_PATTERNS.map((p) => ({ id: p.id, label: p.label, beats: [...p.beats] }));
  const choices = shuffleInPlace(pool, rng).slice(0, choiceCount);
  if (!choices.find((c) => c.id === correct.id)) {
    choices[0] = { id: correct.id, label: correct.label, beats: [...correct.beats] };
    shuffleInPlace(choices, rng);
  }
  return {
    public: {
      date,
      kind: "rhythm-recognition",
      difficulty,
      title: "Catch the rhythm",
      description: "Listen to a short pattern and pick the matching description.",
      estimatedSeconds: 50,
      prompt: "Which rhythmic pattern did you hear?",
      content: {
        kind: "rhythm-recognition",
        playBeats: [...correct.beats],
        choices: choices.map((c) => ({ id: c.id, label: c.label })),
      },
    },
    secret: {
      kind: "rhythm-recognition",
      answer: correct.id,
      correctLabel: correct.label,
      explanation: `The pattern was “${correct.label}”. Listening for note density and rests is the fastest way to lock it in.`,
    },
  };
}

function buildTempo(date: string, rng: () => number, difficulty: PuzzleDifficulty): InternalPuzzle {
  const bpm = TEMPO_POOL[pickIndex(rng, TEMPO_POOL.length)];
  const spread = difficulty === "easy" ? 20 : difficulty === "medium" ? 12 : 8;
  const choices = shuffleInPlace(
    Array.from(
      new Set([
        bpm,
        bpm - spread,
        bpm + spread,
        bpm + (difficulty === "hard" ? Math.round(spread / 2) : spread * 2),
      ].filter((v) => v >= 50 && v <= 160)),
    ),
    rng,
  ).slice(0, 4);
  if (!choices.includes(bpm)) choices[0] = bpm;
  shuffleInPlace(choices, rng);
  return {
    public: {
      date,
      kind: "tempo-challenge",
      difficulty,
      title: "Guess the tempo",
      description: "Internalize a short click track, then estimate the BPM.",
      estimatedSeconds: 60,
      prompt: "What tempo (BPM) was that?",
      content: {
        kind: "tempo-challenge",
        playBpm: bpm,
        clickCount: difficulty === "hard" ? 6 : 8,
        subdivision: "quarter",
        bpmChoices: choices,
      },
    },
    secret: {
      kind: "tempo-challenge",
      answer: bpm,
      correctLabel: `${bpm} BPM`,
      explanation: `The metronome played at ${bpm} BPM. Close estimates still score well — exact matches earn a perfect rating.`,
    },
  };
}

function buildFretboard(date: string, rng: () => number, difficulty: PuzzleDifficulty): InternalPuzzle {
  const string = (6 - pickIndex(rng, 6)) as GuitarString;
  const maxFret = difficulty === "easy" ? 3 : difficulty === "medium" ? 7 : 12;
  const fret = pickIndex(rng, maxFret + 1);
  const note = noteAt({ string, fret }, OPEN_MIDI, "sharps");
  const answer = note.name.replace("♯", "#");
  const letters = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const set = new Set<string>([answer]);
  while (set.size < 4) set.add(letters[pickIndex(rng, letters.length)]);
  const choices = shuffleInPlace([...set], rng);
  return {
    public: {
      date,
      kind: "fretboard-challenge",
      difficulty,
      title: "Fretboard note",
      description: "Identify the highlighted guitar note — conventional neck, low E on top.",
      estimatedSeconds: 55,
      prompt: `What note is on string ${string}, fret ${fret}?`,
      content: {
        kind: "fretboard-challenge",
        string,
        fret,
        mode: "identify",
        choices,
      },
    },
    secret: {
      kind: "fretboard-challenge",
      answer,
      correctLabel: answer,
      explanation: `String ${string} fret ${fret} is ${note.fullName}. Low E is string 6 at the top of the diagram.`,
    },
  };
}

function buildMemory(date: string, rng: () => number, difficulty: PuzzleDifficulty): InternalPuzzle {
  const len = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const sequence = Array.from({ length: len }, () => letters[pickIndex(rng, letters.length)]);
  const correctLabel = sequence.join(" · ");
  const distractors: string[][] = [];
  while (distractors.length < 3) {
    const alt = sequence.map((n, i) => (rng() < 0.45 ? letters[pickIndex(rng, letters.length)] : n));
    if (alt.join() === sequence.join()) continue;
    if (distractors.some((d) => d.join() === alt.join())) continue;
    distractors.push(alt);
  }
  const choices = shuffleInPlace([sequence, ...distractors], rng);
  const answerIndex = choices.findIndex((c) => c.join() === sequence.join());
  return {
    public: {
      date,
      kind: "musical-memory",
      difficulty,
      title: "Remember the sequence",
      description: "Watch a short note sequence, then pick it from the options.",
      estimatedSeconds: 50,
      prompt: "Which sequence did you just see?",
      content: {
        kind: "musical-memory",
        sequenceLabels: sequence,
        choices,
      },
    },
    secret: {
      kind: "musical-memory",
      answer: answerIndex,
      correctLabel,
      explanation: `The sequence was ${correctLabel}. Chunking into pairs helps musical memory stick.`,
    },
  };
}

function buildEar(date: string, rng: () => number, difficulty: PuzzleDifficulty): InternalPuzzle {
  const base = 60 + pickIndex(rng, 12);
  const same = rng() < 0.5;
  const interval = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 + pickIndex(rng, 3) : 1 + pickIndex(rng, 7);
  const midiA = base;
  const midiB = same ? base : base + interval;
  const answer = same ? "Same" : "Different";
  return {
    public: {
      date,
      kind: "ear-training",
      difficulty,
      title: "Same or different?",
      description: "Listen carefully — are the two pitches identical?",
      estimatedSeconds: 40,
      prompt: "Are these two notes the same pitch or different?",
      content: {
        kind: "ear-training",
        midiA,
        midiB,
        mode: "same-or-different",
        choices: ["Same", "Different"],
      },
    },
    secret: {
      kind: "ear-training",
      answer,
      correctLabel: answer,
      explanation: same
        ? "Both tones shared the same pitch."
        : `The pitches differed by ${interval} semitone${interval === 1 ? "" : "s"} (${midiToNote(midiA).name} → ${midiToNote(midiB).name}).`,
    },
  };
}

export function buildDailyPuzzle(dateKey = puzzleDayKey()): InternalPuzzle {
  const rng = seededRng(dateKey);
  const kind = KINDS[dayIndex(dateKey) % KINDS.length];
  const difficulty = difficultyFor(dayIndex(dateKey));
  switch (kind) {
    case "note-recognition":
      return buildNoteRecognition(dateKey, rng, difficulty);
    case "rhythm-recognition":
      return buildRhythm(dateKey, rng, difficulty);
    case "tempo-challenge":
      return buildTempo(dateKey, rng, difficulty);
    case "fretboard-challenge":
      return buildFretboard(dateKey, rng, difficulty);
    case "musical-memory":
      return buildMemory(dateKey, rng, difficulty);
    case "ear-training":
      return buildEar(dateKey, rng, difficulty);
  }
}

export function getPublicPuzzle(dateKey = puzzleDayKey()): PublicPuzzle {
  return buildDailyPuzzle(dateKey).public;
}

export function getPuzzleMeta(dateKey: string): Pick<PublicPuzzle, "date" | "kind" | "difficulty" | "title" | "description" | "estimatedSeconds"> {
  const p = getPublicPuzzle(dateKey);
  return {
    date: p.date,
    kind: p.kind,
    difficulty: p.difficulty,
    title: p.title,
    description: p.description,
    estimatedSeconds: p.estimatedSeconds,
  };
}

function ratingFor(score: number): PuzzleResult["rating"] {
  if (score >= 100) return "Perfect";
  if (score >= 80) return "Great";
  if (score >= 55) return "Good";
  return "Keep practicing";
}

export function gradePuzzle(dateKey: string, answer: PuzzleAnswer): PuzzleResult {
  const { public: pub, secret } = buildDailyPuzzle(dateKey);
  if (answer.kind !== pub.kind) {
    return {
      date: dateKey,
      kind: pub.kind,
      correct: false,
      score: 0,
      rating: "Keep practicing",
      explanation: "That answer doesn’t match today’s puzzle type.",
      correctLabel: secret.correctLabel,
      submittedLabel: "—",
    };
  }

  let correct = false;
  let score = 0;
  let submittedLabel = "";

  switch (answer.kind) {
    case "note-recognition":
      submittedLabel = answer.choice;
      correct = answer.choice === secret.answer;
      score = correct ? 100 : 0;
      break;
    case "rhythm-recognition":
      submittedLabel = pub.content.kind === "rhythm-recognition"
        ? pub.content.choices.find((c) => c.id === answer.choiceId)?.label ?? answer.choiceId
        : answer.choiceId;
      correct = answer.choiceId === secret.answer;
      score = correct ? 100 : 0;
      break;
    case "tempo-challenge": {
      submittedLabel = `${answer.bpm} BPM`;
      const actual = secret.answer as number;
      const err = Math.abs(answer.bpm - actual);
      correct = err === 0;
      if (err === 0) score = 100;
      else if (err <= 4) score = 90;
      else if (err <= 8) score = 75;
      else if (err <= 12) score = 55;
      else score = Math.max(0, 40 - err);
      break;
    }
    case "fretboard-challenge":
      submittedLabel = answer.choice;
      correct = answer.choice === secret.answer || answer.choice.replace("#", "♯") === String(secret.answer).replace("#", "♯");
      // Normalize comparison
      correct =
        answer.choice.replace("♯", "#").toUpperCase() === String(secret.answer).replace("♯", "#").toUpperCase();
      score = correct ? 100 : 0;
      break;
    case "musical-memory":
      submittedLabel =
        pub.content.kind === "musical-memory"
          ? (pub.content.choices[answer.choiceIndex] ?? []).join(" · ")
          : String(answer.choiceIndex);
      correct = answer.choiceIndex === secret.answer;
      score = correct ? 100 : 0;
      break;
    case "ear-training":
      submittedLabel = answer.choice;
      correct = answer.choice === secret.answer;
      score = correct ? 100 : 0;
      break;
  }

  return {
    date: dateKey,
    kind: pub.kind,
    correct: score >= 80,
    score,
    rating: ratingFor(score),
    explanation: secret.explanation,
    correctLabel: secret.correctLabel,
    submittedLabel,
  };
}
