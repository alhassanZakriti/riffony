import type { ScoreResult } from "@/types";
import { mean, round } from "@/lib/utils";
import { composeScore, linearCredit } from "./compose";
import { SCORING } from "./weights";

export type NoteOutcome = "correct" | "wrong" | "octave" | "missed";

export interface NoteTrial {
  targetMidi: number;
  detectedMidi: number | null;
  /** Signed cents from the detected note's equal-tempered pitch. */
  cents: number | null;
  outcome: NoteOutcome;
  reactionMs: number | null;
}

export function evaluateNote(targetMidi: number, detectedMidi: number, anyOctave: boolean): NoteOutcome {
  if (detectedMidi === targetMidi) return "correct";
  if ((((detectedMidi - targetMidi) % 12) + 12) % 12 === 0) return anyOctave ? "correct" : "octave";
  return "wrong";
}

export type TuningVerdict = "in-tune" | "sharp" | "flat";

export function tuningVerdict(cents: number): TuningVerdict {
  if (cents > SCORING.notes.inTuneCents) return "sharp";
  if (cents < -SCORING.notes.inTuneCents) return "flat";
  return "in-tune";
}

export function noteSpeedCredit(reactionMs: number) {
  return linearCredit(reactionMs, SCORING.notes.fastMs, SCORING.notes.slowMs);
}

export function scoreNotes(trials: NoteTrial[]): ScoreResult {
  const cfg = SCORING.notes;
  const total = trials.length || 1;
  const correct = trials.filter((t) => t.outcome === "correct");
  const intonation = correct.reduce((s, t) => s + linearCredit(Math.abs(t.cents ?? 50), 0, 50), 0) / total;
  const speed = correct.reduce((s, t) => s + noteSpeedCredit(t.reactionMs ?? cfg.slowMs), 0) / total;
  const avgCents = correct.length ? mean(correct.map((t) => Math.abs(t.cents ?? 0))) : 0;
  const avgRt = correct.length ? mean(correct.map((t) => t.reactionMs ?? 0)) : 0;

  return composeScore([
    {
      id: "accuracy",
      label: "Correct notes",
      value: correct.length / total,
      weight: cfg.weights.accuracy,
      detail: `${correct.length} of ${trials.length} notes matched the target, including octave.`,
    },
    {
      id: "intonation",
      label: "Intonation",
      value: intonation,
      weight: cfg.weights.intonation,
      detail: `Correct notes were ${round(avgCents)}¢ from centre on average. 0¢ earns full credit, 50¢ earns none.`,
    },
    {
      id: "speed",
      label: "Response time",
      value: speed,
      weight: cfg.weights.speed,
      detail: `Average ${round(avgRt)} ms to a stable note. Full credit at ${cfg.fastMs} ms, none at ${cfg.slowMs} ms.`,
    },
  ]);
}
