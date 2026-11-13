/**
 * All scoring constants live here so formulas stay transparent and tunable.
 * Weights inside each block are relative and normalised by their sum.
 */
export const SCORING = {
  tempo: {
    weights: { timing: 40, consistency: 25, stability: 15, completeness: 20 },
    /** Grade windows in ms, each capped at a fraction of the beat interval. */
    windows: {
      perfect: { ms: 25, fraction: 0.1 },
      great: { ms: 50, fraction: 0.2 },
      good: { ms: 90, fraction: 0.32 },
    },
    gradeValue: { perfect: 1, great: 0.8, good: 0.5, off: 0.2 },
    /** Interval coefficient of variation mapped to 100% … 0% consistency. */
    cvBest: 0.02,
    cvWorst: 0.15,
    /** Combined tempo error (%) at which stability reaches 0. */
    stabilityLimitPct: 8,
    extraPenalty: 0.5,
  },
  guess: {
    weights: { estimation: 80, precision: 20 },
    /** Error (%) at which a round scores 0. */
    zeroAtPct: 15,
    precisePct: 3,
    accuratePct: 5,
  },
  fingers: {
    weights: { accuracy: 60, speed: 30, discipline: 10 },
    /** Reaction time (ms) that earns full / zero speed credit. */
    fastMs: 200,
    slowMs: 900,
  },
  notes: {
    weights: { accuracy: 60, intonation: 20, speed: 20 },
    fastMs: 600,
    slowMs: 3000,
    /** |cents| beyond which a correct note is reported as sharp/flat. */
    inTuneCents: 15,
  },
  fretboard: {
    weights: { accuracy: 65, speed: 25, discipline: 10 },
    fastMs: 1500,
    slowMs: 8000,
  },
  voice: {
    weights: { accuracy: 55, intonation: 25, stability: 20 },
    /** |cents| within which a sung note counts as matched. */
    matchCents: { 0: 45, 1: 35, 2: 25, 3: 18 },
    /** Stability: fraction of held samples inside the match window. */
    stableInside: 0.7,
    fastMs: 900,
    slowMs: 4000,
  },
} as const;
