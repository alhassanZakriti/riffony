import { describe, expect, it } from "vitest";
import { evaluateSungPitch, scoreStability, scoreVoiceMatch } from "@/features/voice-training/scoring";
import { isModeUnlocked, recordVoiceSession } from "@/features/voice-training/progression";
import { emptyVoiceProgress } from "@/features/voice-training/types";
import { INTERVALS_BY_TIER, SCALE_STEPS, poolMatchMidis } from "@/features/voice-training/theory";

describe("voice training", () => {
  it("scores pitch matches with cents tolerance", () => {
    const ok = evaluateSungPitch(57, 57, 10, 35);
    expect(ok.correct).toBe(true);
    const flat = evaluateSungPitch(57, 56, 0, 35);
    expect(flat.correct).toBe(false);
    expect(flat.signedCents).toBeLessThan(0);
  });

  it("builds match pools inside a comfortable band", () => {
    const pool = poolMatchMidis(0, 55, 62);
    expect(pool.every((m) => m >= 55 && m <= 62)).toBe(true);
    expect(pool.length).toBeGreaterThan(0);
  });

  it("unlocks warmups after a qualifying match session", () => {
    let progress = emptyVoiceProgress();
    expect(isModeUnlocked(progress, "warmup")).toBe(false);
    progress = recordVoiceSession(progress, "match", 70, 8, 10, 20);
    expect(isModeUnlocked(progress, "warmup")).toBe(true);
  });

  it("scores stability without punishing mild vibrato-sized scatter", () => {
    const target = 60;
    const samples = Array.from({ length: 40 }, (_, i) => target + (i % 2 === 0 ? 0.05 : -0.05));
    const scored = scoreStability(samples, target, 35);
    expect(scored.score).toBeGreaterThan(70);
  });

  it("exposes progressive intervals and scales", () => {
    expect(INTERVALS_BY_TIER[0].some((i) => i.semitones === 4)).toBe(true);
    expect(SCALE_STEPS.major).toEqual([0, 2, 4, 5, 7, 9, 11, 12]);
  });

  it("scores a clean matching session highly", () => {
    const trials = Array.from({ length: 8 }, () => ({
      targetMidi: 57,
      detectedMidi: 57,
      cents: 8,
      correct: true,
      reactionMs: 700,
    }));
    expect(scoreVoiceMatch(trials, 0).score).toBeGreaterThan(85);
  });
});
