import type { ScoreResult } from "@/types";
import { mean, round } from "@/lib/utils";
import { composeScore, linearCredit } from "./compose";
import { SCORING } from "./weights";

export interface GuessRound {
  actualBpm: number;
  guessBpm: number;
  pattern: string;
  replays: number;
}

export const guessErrorPct = (r: GuessRound) => (Math.abs(r.guessBpm - r.actualBpm) / r.actualBpm) * 100;

export function roundCredit(r: GuessRound) {
  return linearCredit(guessErrorPct(r), 0, SCORING.guess.zeroAtPct);
}

export function scoreGuess(rounds: GuessRound[]): ScoreResult {
  const cfg = SCORING.guess;
  const errors = rounds.map(guessErrorPct);
  const estimation = rounds.length ? mean(rounds.map(roundCredit)) : 0;
  const precise = rounds.length ? errors.filter((e) => e <= cfg.precisePct).length / rounds.length : 0;
  return composeScore([
    {
      id: "estimation",
      label: "Estimation accuracy",
      value: estimation,
      weight: cfg.weights.estimation,
      detail: `Average error ${round(mean(errors), 1)}%. Each round loses credit linearly until ${cfg.zeroAtPct}% off.`,
    },
    {
      id: "precision",
      label: "Precision",
      value: precise,
      weight: cfg.weights.precision,
      detail: `${errors.filter((e) => e <= cfg.precisePct).length} of ${rounds.length} rounds within ${cfg.precisePct}% of the real tempo.`,
    },
  ]);
}
