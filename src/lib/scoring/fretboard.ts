import type { ScoreResult } from "@/types";
import { mean, round } from "@/lib/utils";
import { composeScore, linearCredit } from "./compose";
import { SCORING } from "./weights";

export interface FretboardTrialScore {
  correct: boolean;
  reactionMs: number | null;
  usedHint: boolean;
}

export function scoreFretboard(trials: FretboardTrialScore[]): ScoreResult {
  const cfg = SCORING.fretboard;
  const total = trials.length || 1;
  const correct = trials.filter((t) => t.correct);
  // Hints reduce credit for that trial's accuracy contribution.
  const accuracy =
    trials.reduce((s, t) => s + (t.correct ? (t.usedHint ? 0.6 : 1) : 0), 0) / total;
  const rts = correct.map((t) => t.reactionMs ?? cfg.slowMs);
  const speed = correct.reduce((s, t) => s + linearCredit(t.reactionMs ?? cfg.slowMs, cfg.fastMs, cfg.slowMs), 0) / total;
  const discipline = trials.reduce((s, t) => s + (t.usedHint ? 0 : 1), 0) / total;

  return composeScore([
    {
      id: "accuracy",
      label: "Accuracy",
      value: accuracy,
      weight: cfg.weights.accuracy,
      detail: `${correct.length} of ${trials.length} correct. Hints award 60% credit for that trial.`,
    },
    {
      id: "speed",
      label: "Response speed",
      value: speed,
      weight: cfg.weights.speed,
      detail: `Average correct response ${round(mean(rts))} ms. Full credit at ${cfg.fastMs} ms, none at ${cfg.slowMs} ms.`,
    },
    {
      id: "discipline",
      label: "Unaided recall",
      value: discipline,
      weight: cfg.weights.discipline,
      detail: `${trials.filter((t) => t.usedHint).length} hints used. Unprompted answers earn full discipline credit.`,
    },
  ]);
}
