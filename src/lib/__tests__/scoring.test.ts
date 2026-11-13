import { describe, expect, it } from "vitest";
import { analyzeTempo, gradeDeviation, isPerfectTempo, scoreTempo, type TimedEvent } from "@/lib/scoring/tempo";
import { scoreFingers, type FingerTrial } from "@/lib/scoring/fingers";
import { evaluateNote, scoreNotes, tuningVerdict } from "@/lib/scoring/notes";
import { scoreGuess } from "@/lib/scoring/guess";
import { highestUnlockedTier } from "@/features/gamification/tiers";
import { levelFromXp, xpForLevel } from "@/features/gamification/xp";
import type { SessionRecord } from "@/types";

const grid = (n: number, interval: number, start = 1000): TimedEvent[] =>
  Array.from({ length: n }, (_, i) => ({ time: start + i * interval, segment: 0 }));

describe("tempo analysis", () => {
  const interval = 500;

  it("scores perfect taps at 100", () => {
    const expected = grid(16, interval);
    const a = analyzeTempo(expected, expected, interval);
    expect(a.missed).toBe(0);
    expect(a.extra).toBe(0);
    expect(isPerfectTempo(a)).toBe(true);
    expect(scoreTempo(a).score).toBe(100);
  });

  it("counts missed and extra taps", () => {
    const expected = grid(8, interval);
    const taps = [...expected.slice(0, 6), { time: expected[2].time + 30, segment: 0 }, { time: 99999, segment: 0 }];
    const a = analyzeTempo(expected, taps, interval);
    expect(a.missed).toBe(2);
    expect(a.extra).toBe(2);
  });

  it("keeps the closer of two competing taps", () => {
    const expected = grid(4, interval);
    const taps = [{ time: expected[1].time + 80, segment: 0 }, { time: expected[1].time + 5, segment: 0 }];
    const a = analyzeTempo(expected, taps, interval);
    expect(a.hits.find((h) => h.expectedIndex === 1)?.deviation).toBe(5);
    expect(a.extra).toBe(1);
  });

  it("detects a rushed tempo", () => {
    const expected = grid(24, interval);
    const taps = expected.map((e, i) => ({ time: e.time - i * 10, segment: 0 }));
    const a = analyzeTempo(expected, taps, interval);
    expect(a.rateRatio!).toBeGreaterThan(1);
    expect(a.bpmErrorPct).toBeCloseTo(2, 0);
    expect(scoreTempo(a).score).toBeLessThan(80);
  });

  it("does not compute intervals across pause segments", () => {
    const expected = [...grid(4, interval), ...grid(4, interval, 20000).map((e) => ({ ...e, segment: 1 }))];
    const a = analyzeTempo(expected, expected, interval);
    expect(a.intervalCv).toBe(0);
    expect(a.bpmErrorPct).toBeCloseTo(0);
  });

  it("scales grade windows with fast subdivisions", () => {
    expect(gradeDeviation(20, 500)).toBe("perfect");
    expect(gradeDeviation(20, 150)).toBe("great");
  });
});

describe("finger scoring", () => {
  const trial = (outcome: FingerTrial["outcome"], rt: number | null): FingerTrial => ({
    target: "left-index",
    pressed: outcome === "missed" ? null : ["left-index"],
    outcome,
    reactionMs: rt,
    windowMs: 1500,
  });

  it("never rewards fast wrong answers over slow correct ones", () => {
    const fastWrong = scoreFingers(Array.from({ length: 10 }, () => trial("wrong", 150)), 0).score;
    const slowCorrect = scoreFingers(Array.from({ length: 10 }, () => trial("correct", 1200)), 0).score;
    expect(slowCorrect).toBeGreaterThan(fastWrong);
  });

  it("caps speed credit by accuracy", () => {
    const oneFast = scoreFingers([trial("correct", 150), ...Array.from({ length: 9 }, () => trial("missed", null))], 0);
    expect(oneFast.score).toBeLessThan(20);
  });

  it("is deterministic", () => {
    const t = [trial("correct", 300), trial("wrong", 200), trial("correct", 500)];
    expect(scoreFingers(t, 1)).toEqual(scoreFingers(t, 1));
  });
});

describe("note scoring", () => {
  it("distinguishes octave errors", () => {
    expect(evaluateNote(60, 48, false)).toBe("octave");
    expect(evaluateNote(60, 48, true)).toBe("correct");
    expect(evaluateNote(60, 62, false)).toBe("wrong");
  });

  it("reports sharp and flat", () => {
    expect(tuningVerdict(25)).toBe("sharp");
    expect(tuningVerdict(-25)).toBe("flat");
    expect(tuningVerdict(5)).toBe("in-tune");
  });

  it("scores a perfect fast session at 100", () => {
    const s = scoreNotes([{ targetMidi: 60, detectedMidi: 60, cents: 0, outcome: "correct", reactionMs: 500 }]);
    expect(s.score).toBe(100);
  });
});

describe("guess scoring", () => {
  it("rewards exact guesses and zeroes far ones", () => {
    expect(scoreGuess([{ actualBpm: 100, guessBpm: 100, pattern: "x", replays: 0 }]).score).toBe(100);
    expect(scoreGuess([{ actualBpm: 100, guessBpm: 130, pattern: "x", replays: 0 }]).score).toBe(0);
  });
});

describe("progression", () => {
  const session = (tier: 0 | 1 | 2 | 3, score: number, accuracy = 0.9): SessionRecord =>
    ({ category: "fingers", tier, score, accuracy }) as SessionRecord;

  it("unlocks tiers only through performance", () => {
    expect(highestUnlockedTier(Array.from({ length: 20 }, () => session(0, 70)), "fingers")).toBe(0);
    expect(highestUnlockedTier([session(0, 85, 0.7), session(0, 90, 0.7)], "fingers")).toBe(0);
    expect(highestUnlockedTier([session(0, 85), session(0, 81)], "fingers")).toBe(1);
    expect(highestUnlockedTier([session(0, 85), session(0, 81), session(1, 90), session(1, 95)], "fingers")).toBe(2);
  });

  it("computes levels from xp", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(xpForLevel(3)).level).toBe(3);
    expect(levelFromXp(xpForLevel(3) - 1).level).toBe(2);
  });
});
