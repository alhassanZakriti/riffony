import type { FingerId, ScoreResult } from "@/types";
import { mean, round } from "@/lib/utils";
import { composeScore, linearCredit } from "./compose";
import { SCORING } from "./weights";

export type FingerOutcome = "correct" | "wrong" | "missed";

export interface FingerTrial {
  target: FingerId;
  /** Fingers that could have produced the pressed key (Space maps to both thumbs). */
  pressed: FingerId[] | null;
  outcome: FingerOutcome;
  reactionMs: number | null;
  windowMs: number;
}

export function fingerSpeedCredit(reactionMs: number) {
  const { fastMs, slowMs } = SCORING.fingers;
  return linearCredit(reactionMs, fastMs, slowMs);
}

/**
 * Wrong answers earn nothing regardless of speed, and speed credit is divided
 * by all trials, so it can never outweigh accuracy.
 */
export function scoreFingers(trials: FingerTrial[], falseStarts: number): ScoreResult {
  const cfg = SCORING.fingers;
  const total = trials.length || 1;
  const correct = trials.filter((t) => t.outcome === "correct");
  const correctRts = correct.map((t) => t.reactionMs ?? cfg.slowMs);
  const speed = correct.reduce((s, t) => s + fingerSpeedCredit(t.reactionMs ?? cfg.slowMs), 0) / total;
  const discipline = Math.max(0, 1 - falseStarts / total);

  return composeScore([
    {
      id: "accuracy",
      label: "Accuracy",
      value: correct.length / total,
      weight: cfg.weights.accuracy,
      detail: `${correct.length} of ${trials.length} correct. Wrong or missed instructions earn nothing.`,
    },
    {
      id: "speed",
      label: "Reaction speed",
      value: speed,
      weight: cfg.weights.speed,
      detail: `Average correct reaction ${round(mean(correctRts))} ms. Full credit at ${cfg.fastMs} ms, none at ${cfg.slowMs} ms. Only correct answers count.`,
    },
    {
      id: "discipline",
      label: "Discipline",
      value: discipline,
      weight: cfg.weights.discipline,
      detail: `${falseStarts} key presses before an instruction appeared.`,
    },
  ]);
}
