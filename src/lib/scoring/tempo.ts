import type { ScoreResult } from "@/types";
import { clamp01, mean, round, stdDev } from "@/lib/utils";
import { composeScore, linearCredit } from "./compose";
import { SCORING } from "./weights";

export type HitGrade = "perfect" | "great" | "good" | "off";

export interface TimedEvent {
  /** performance.now() timeline, ms. */
  time: number;
  /** Increments after each pause/resume so intervals never span a gap. */
  segment: number;
}

export interface TempoHit {
  expectedIndex: number;
  tapTime: number;
  /** Signed ms; negative = early. */
  deviation: number;
  grade: HitGrade;
}

export interface TempoAnalysis {
  expectedCount: number;
  hits: TempoHit[];
  missed: number;
  extra: number;
  meanAbsDeviation: number;
  meanSignedDeviation: number;
  intervalCv: number;
  /** Played tempo ÷ target tempo (1 = exact), or null with too few hits. */
  rateRatio: number | null;
  bpmErrorPct: number;
  driftPct: number;
  grades: Record<HitGrade, number>;
}

export function gradeWindows(intervalMs: number) {
  const w = SCORING.tempo.windows;
  return {
    perfect: Math.min(w.perfect.ms, intervalMs * w.perfect.fraction),
    great: Math.min(w.great.ms, intervalMs * w.great.fraction),
    good: Math.min(w.good.ms, intervalMs * w.good.fraction),
  };
}

export function gradeDeviation(deviationMs: number, intervalMs: number): HitGrade {
  const abs = Math.abs(deviationMs);
  const w = gradeWindows(intervalMs);
  if (abs <= w.perfect) return "perfect";
  if (abs <= w.great) return "great";
  if (abs <= w.good) return "good";
  return "off";
}

/** Index of the expected event nearest to `time` within the same segment. */
function nearestExpected(expected: TimedEvent[], time: number, segment: number) {
  let lo = 0;
  let hi = expected.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (expected[mid].time < time) lo = mid + 1;
    else hi = mid;
  }
  let best = -1;
  let bestDist = Infinity;
  for (const i of [lo - 1, lo, lo + 1]) {
    if (i < 0 || i >= expected.length || expected[i].segment !== segment) continue;
    const d = Math.abs(expected[i].time - time);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Matches taps to expected beats. Each beat accepts at most one tap within
 * half an interval; when two taps compete, the closer one wins and the other
 * counts as an extra.
 */
export function analyzeTempo(expected: TimedEvent[], taps: TimedEvent[], intervalMs: number): TempoAnalysis {
  const sortedExpected = [...expected].sort((a, b) => a.time - b.time);
  const sortedTaps = [...taps].sort((a, b) => a.time - b.time);
  const assigned = new Map<number, { tapTime: number; dist: number }>();
  let extra = 0;

  for (const tap of sortedTaps) {
    const idx = nearestExpected(sortedExpected, tap.time, tap.segment);
    if (idx === -1) {
      extra++;
      continue;
    }
    const dist = Math.abs(tap.time - sortedExpected[idx].time);
    if (dist > intervalMs / 2) {
      extra++;
      continue;
    }
    const current = assigned.get(idx);
    if (!current) assigned.set(idx, { tapTime: tap.time, dist });
    else {
      extra++;
      if (dist < current.dist) assigned.set(idx, { tapTime: tap.time, dist });
    }
  }

  const hits: TempoHit[] = [...assigned.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([expectedIndex, { tapTime }]) => {
      const deviation = tapTime - sortedExpected[expectedIndex].time;
      return { expectedIndex, tapTime, deviation, grade: gradeDeviation(deviation, intervalMs) };
    });

  const grades: Record<HitGrade, number> = { perfect: 0, great: 0, good: 0, off: 0 };
  for (const h of hits) grades[h.grade]++;

  // Inter-tap intervals between adjacent beats of the same segment.
  const ratios: number[] = [];
  for (let i = 1; i < hits.length; i++) {
    const a = hits[i - 1];
    const b = hits[i];
    const gap = b.expectedIndex - a.expectedIndex;
    if (gap !== 1 || sortedExpected[a.expectedIndex].segment !== sortedExpected[b.expectedIndex].segment) continue;
    ratios.push((b.tapTime - a.tapTime) / intervalMs);
  }
  const intervalCv = ratios.length >= 2 ? stdDev(ratios) / (mean(ratios) || 1) : 0;

  // Effective tempo: least-squares slope of tap time against beat index,
  // computed per segment and averaged by the number of hits in each.
  let rateRatio: number | null = null;
  let bpmErrorPct = 0;
  {
    const bySegment = new Map<number, TempoHit[]>();
    for (const h of hits) {
      const seg = sortedExpected[h.expectedIndex].segment;
      const list = bySegment.get(seg) ?? [];
      list.push(h);
      bySegment.set(seg, list);
    }
    let weighted = 0;
    let count = 0;
    for (const list of bySegment.values()) {
      if (list.length < 3) continue;
      const xs = list.map((h) => h.expectedIndex);
      const ys = list.map((h) => h.tapTime);
      const mx = mean(xs);
      const my = mean(ys);
      let num = 0;
      let den = 0;
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        den += (xs[i] - mx) ** 2;
      }
      if (den > 0 && num > 0) {
        weighted += (num / den) * list.length;
        count += list.length;
      }
    }
    if (count > 0) {
      const slope = weighted / count;
      rateRatio = intervalMs / slope;
      bpmErrorPct = (Math.abs(slope - intervalMs) / intervalMs) * 100;
    }
  }

  // Drift: how far the average offset moved between the first and last third.
  let driftPct = 0;
  if (hits.length >= 6) {
    const third = Math.floor(hits.length / 3);
    const first = mean(hits.slice(0, third).map((h) => h.deviation));
    const last = mean(hits.slice(-third).map((h) => h.deviation));
    driftPct = (Math.abs(last - first) / intervalMs) * 100;
  }

  return {
    expectedCount: sortedExpected.length,
    hits,
    missed: sortedExpected.length - hits.length,
    extra,
    meanAbsDeviation: hits.length ? mean(hits.map((h) => Math.abs(h.deviation))) : 0,
    meanSignedDeviation: hits.length ? mean(hits.map((h) => h.deviation)) : 0,
    intervalCv,
    rateRatio,
    bpmErrorPct,
    driftPct,
    grades,
  };
}

export function scoreTempo(a: TempoAnalysis): ScoreResult {
  const cfg = SCORING.tempo;
  const timing = a.hits.length ? mean(a.hits.map((h) => cfg.gradeValue[h.grade])) : 0;
  const consistency = a.hits.length >= 3 ? linearCredit(a.intervalCv, cfg.cvBest, cfg.cvWorst) : 0;
  const tempoError = a.bpmErrorPct + a.driftPct / 2;
  const stability = a.hits.length >= 3 ? clamp01(1 - tempoError / cfg.stabilityLimitPct) : 0;
  const completeness = a.expectedCount
    ? clamp01(1 - (a.missed + a.extra * cfg.extraPenalty) / a.expectedCount)
    : 0;

  return composeScore([
    {
      id: "timing",
      label: "Timing accuracy",
      value: timing,
      weight: cfg.weights.timing,
      detail: `Average offset ${round(a.meanAbsDeviation)} ms. Perfect = 100%, Great = 80%, Good = 50%, Off = 20% credit per hit.`,
    },
    {
      id: "consistency",
      label: "Consistency",
      value: consistency,
      weight: cfg.weights.consistency,
      detail: `Your intervals varied by ${round(a.intervalCv * 100, 1)}%. ${cfg.cvBest * 100}% or less earns full credit; ${cfg.cvWorst * 100}% earns none.`,
    },
    {
      id: "stability",
      label: "Tempo stability",
      value: stability,
      weight: cfg.weights.stability,
      detail: `Tempo error ${round(a.bpmErrorPct, 1)}% and drift ${round(a.driftPct, 1)}% of a beat between the start and the end.`,
    },
    {
      id: "completeness",
      label: "Completeness",
      value: completeness,
      weight: cfg.weights.completeness,
      detail: `${a.missed} missed and ${a.extra} extra taps out of ${a.expectedCount} beats. Extras cost half as much as misses.`,
    },
  ]);
}

export function isPerfectTempo(a: TempoAnalysis) {
  return a.expectedCount > 0 && a.missed === 0 && a.extra === 0 && a.grades.good === 0 && a.grades.off === 0;
}
