import { describe, expect, it } from "vitest";
import { buildDailyPuzzle, getPublicPuzzle, gradePuzzle } from "@/features/daily-puzzle/generator";
import { puzzleDayKey } from "@/features/daily-puzzle/date";
import type { PuzzleAnswer } from "@/features/daily-puzzle/types";

describe("daily puzzle", () => {
  it("is deterministic for a given UTC date", () => {
    const a = getPublicPuzzle("2026-03-15");
    const b = getPublicPuzzle("2026-03-15");
    expect(a).toEqual(b);
    expect(a.date).toBe("2026-03-15");
  });

  it("changes across days", () => {
    const a = getPublicPuzzle("2026-03-15");
    const b = getPublicPuzzle("2026-03-16");
    expect(a.kind !== b.kind || a.title !== b.title || JSON.stringify(a.content) !== JSON.stringify(b.content)).toBe(
      true,
    );
  });

  it("does not expose secret answer fields on the public payload", () => {
    const pub = getPublicPuzzle("2026-01-01");
    const raw = JSON.stringify(pub);
    expect(raw.includes("correctLabel")).toBe(false);
    expect(raw.includes("secret")).toBe(false);
  });

  it("grades the correct answer as a high score", () => {
    const date = "2026-06-01";
    const { public: pub, secret } = buildDailyPuzzle(date);
    let answer: PuzzleAnswer;
    switch (pub.kind) {
      case "note-recognition":
        answer = { kind: "note-recognition", choice: String(secret.answer) };
        break;
      case "rhythm-recognition":
        answer = { kind: "rhythm-recognition", choiceId: String(secret.answer) };
        break;
      case "tempo-challenge":
        answer = { kind: "tempo-challenge", bpm: Number(secret.answer) };
        break;
      case "fretboard-challenge":
        answer = { kind: "fretboard-challenge", choice: String(secret.answer) };
        break;
      case "musical-memory":
        answer = { kind: "musical-memory", choiceIndex: Number(secret.answer) };
        break;
      case "ear-training":
        answer = { kind: "ear-training", choice: secret.answer as "Same" | "Different" };
        break;
    }
    const result = gradePuzzle(date, answer);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("puzzleDayKey uses UTC", () => {
    const key = puzzleDayKey(new Date("2026-11-12T23:30:00Z"));
    expect(key).toBe("2026-11-12");
  });
});
