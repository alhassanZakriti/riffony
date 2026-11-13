import type { ScoreResult, Tier } from "@/types";
import { mean, round } from "@/lib/utils";
import { composeScore, linearCredit } from "@/lib/scoring/compose";
import { SCORING } from "@/lib/scoring/weights";
import { withinCents } from "./theory";

export interface VoiceTrial {
  targetMidi: number;
  detectedMidi: number | null;
  cents: number | null;
  correct: boolean;
  reactionMs: number | null;
}

export function scoreVoiceMatch(trials: VoiceTrial[], tier: Tier): ScoreResult {
  const cfg = SCORING.voice;
  const total = trials.length || 1;
  const correct = trials.filter((t) => t.correct);
  const intonation =
    correct.reduce((s, t) => s + linearCredit(Math.abs(t.cents ?? 50), 0, cfg.matchCents[tier] * 1.4), 0) /
    total;
  const speed =
    correct.reduce((s, t) => s + linearCredit(t.reactionMs ?? cfg.slowMs, cfg.fastMs, cfg.slowMs), 0) / total;
  const avgCents = correct.length ? mean(correct.map((t) => Math.abs(t.cents ?? 0))) : 0;

  return composeScore([
    {
      id: "accuracy",
      label: "Pitch matches",
      value: correct.length / total,
      weight: cfg.weights.accuracy,
      detail: `${correct.length} of ${trials.length} notes matched within ±${cfg.matchCents[tier]}¢.`,
    },
    {
      id: "intonation",
      label: "Intonation",
      value: intonation,
      weight: cfg.weights.intonation,
      detail: `Average |deviation| ${round(avgCents)}¢ on correct matches.`,
    },
    {
      id: "stability",
      label: "Response",
      value: speed,
      weight: cfg.weights.stability,
      detail: `Faster, confident matches earn more credit (full by ${cfg.fastMs} ms).`,
    },
  ]);
}

export function evaluateSungPitch(
  targetMidi: number,
  detectedMidi: number,
  detectedCents: number,
  toleranceCents: number,
) {
  const signed = (detectedMidi - targetMidi) * 100 + detectedCents;
  const abs = Math.abs(signed);
  return {
    correct: withinCents(abs, toleranceCents),
    signedCents: signed,
    absCents: abs,
  };
}

export function feedbackForCents(signedCents: number, tolerance: number) {
  const abs = Math.abs(signedCents);
  if (abs <= tolerance * 0.4) return "Excellent match — right on the target.";
  if (abs <= tolerance) {
    return signedCents < 0
      ? "Close — you were slightly flat (below the target)."
      : "Close — you were slightly sharp (above the target).";
  }
  if (signedCents < 0) return "Your pitch was below the reference. Listen once more, then aim a little higher.";
  return "Your pitch was above the reference. Soften and aim a little lower.";
}

export function scoreStability(samples: number[], targetMidi: number, toleranceCents: number): ScoreResult {
  const cfg = SCORING.voice;
  if (samples.length === 0) {
    return composeScore([
      { id: "accuracy", label: "On target", value: 0, weight: 1, detail: "No voiced samples captured." },
    ]);
  }
  const deviations = samples.map((midiFloat) => Math.abs((midiFloat - targetMidi) * 100));
  const inside = deviations.filter((d) => d <= toleranceCents).length / deviations.length;
  const avg = mean(deviations);
  // Soft credit for vibrato-like motion: penalize only large wandering, not small oscillation.
  const spread = Math.sqrt(mean(deviations.map((d) => (d - avg) ** 2)));
  const vibratoFriendly = spread < toleranceCents * 0.85 ? 1 : linearCredit(spread, toleranceCents, toleranceCents * 2.5);

  return composeScore([
    {
      id: "accuracy",
      label: "Time on pitch",
      value: inside,
      weight: cfg.weights.accuracy,
      detail: `${round(inside * 100)}% of samples within ±${toleranceCents}¢.`,
    },
    {
      id: "intonation",
      label: "Average deviation",
      value: linearCredit(avg, 0, toleranceCents * 2),
      weight: cfg.weights.intonation,
      detail: `Mean |deviation| ${round(avg)}¢.`,
    },
    {
      id: "stability",
      label: "Stability",
      value: vibratoFriendly,
      weight: cfg.weights.stability,
      detail: "Small natural variation is tolerated; large wandering reduces credit.",
    },
  ]);
}
