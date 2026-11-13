import type { ScoreComponent, ScoreResult } from "@/types";
import { clamp01, round } from "@/lib/utils";

export function composeScore(components: ScoreComponent[]): ScoreResult {
  const totalWeight = components.reduce((s, c) => s + c.weight, 0) || 1;
  const raw = components.reduce((s, c) => s + clamp01(c.value) * c.weight, 0) / totalWeight;
  return { score: round(raw * 100, 1), components };
}

/** Linear credit: 1 at or below `best`, 0 at or above `worst`. */
export function linearCredit(value: number, best: number, worst: number) {
  if (best === worst) return value <= best ? 1 : 0;
  return clamp01((worst - value) / (worst - best));
}
