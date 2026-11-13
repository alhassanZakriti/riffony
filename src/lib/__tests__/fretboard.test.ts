import { describe, expect, it } from "vitest";
import {
  enharmonicEqual,
  findPositions,
  midiAtPosition,
  noteAtPosition,
  octaveShapeTargets,
  pitchClassName,
} from "@/features/fretboard/engine/note-calculator";
import { STANDARD_OPEN_MIDI } from "@/features/fretboard/engine/tuning";
import { applyRecall, emptyMastery, isDue } from "@/features/fretboard/engine/mastery";
import { validateFind, validateFindAll, validateIdentify } from "@/features/fretboard/engine/answer-validator";
import { highestUnlockedStage, stageUnlocked } from "@/features/fretboard/engine/curriculum";
import { resolveOpenMidi, TUNINGS } from "@/features/fretboard/engine/tuning";
import { scoreFretboard } from "@/lib/scoring/fretboard";
import type { PositionMastery } from "@/features/fretboard/types";

describe("fretboard note calculator", () => {
  it("maps open strings in standard tuning", () => {
    expect(noteAtPosition(6, 0, STANDARD_OPEN_MIDI).name).toBe("E");
    expect(noteAtPosition(5, 0, STANDARD_OPEN_MIDI).name).toBe("A");
    expect(noteAtPosition(4, 0, STANDARD_OPEN_MIDI).name).toBe("D");
    expect(noteAtPosition(3, 0, STANDARD_OPEN_MIDI).name).toBe("G");
    expect(noteAtPosition(2, 0, STANDARD_OPEN_MIDI).name).toBe("B");
    expect(noteAtPosition(1, 0, STANDARD_OPEN_MIDI).name).toBe("E");
    expect(midiAtPosition(6, 0, STANDARD_OPEN_MIDI)).toBe(40);
    expect(midiAtPosition(1, 0, STANDARD_OPEN_MIDI)).toBe(64);
  });

  it("walks the chromatic scale on low E", () => {
    const expected = ["E", "F", "F♯", "G", "G♯", "A", "A♯", "B", "C", "C♯", "D", "D♯", "E"];
    for (let f = 0; f <= 12; f++) {
      expect(noteAtPosition(6, f, STANDARD_OPEN_MIDI).name).toBe(expected[f]);
    }
  });

  it("treats the 12th fret as an octave of the open string", () => {
    for (const s of [1, 2, 3, 4, 5, 6] as const) {
      const open = noteAtPosition(s, 0, STANDARD_OPEN_MIDI);
      const twelve = noteAtPosition(s, 12, STANDARD_OPEN_MIDI);
      expect(twelve.pitchClass).toBe(open.pitchClass);
      expect(twelve.midi).toBe(open.midi + 12);
    }
  });

  it("applies the G–B string exception in octave shapes", () => {
    // Low E fret 3 (G) → D string fret 5
    const fromE = octaveShapeTargets({ string: 6, fret: 3 }, 12);
    expect(fromE.some((t) => t.target.string === 4 && t.target.fret === 5 && t.fretDelta === 2)).toBe(true);

    // G string fret 0 → high E fret 3 (exception: +3)
    const fromG = octaveShapeTargets({ string: 3, fret: 0 }, 12);
    expect(fromG.some((t) => t.target.string === 1 && t.target.fret === 3 && t.fretDelta === 3)).toBe(true);

    // D string fret 0 → B string fret 3 (exception)
    const fromD = octaveShapeTargets({ string: 4, fret: 0 }, 12);
    expect(fromD.some((t) => t.target.string === 2 && t.target.fret === 3 && t.fretDelta === 3)).toBe(true);
  });

  it("supports enharmonic equivalence", () => {
    expect(enharmonicEqual("C♯", "D♭")).toBe(true);
    expect(enharmonicEqual("F♯", "G♭")).toBe(true);
    expect(enharmonicEqual("A", "A♯")).toBe(false);
    expect(pitchClassName(1, "flats")).toBe("D♭");
  });

  it("finds all F♯ positions in 0–12", () => {
    const fs = findPositions(6, STANDARD_OPEN_MIDI, { maxFret: 12 });
    expect(fs.length).toBeGreaterThanOrEqual(6);
    expect(fs.some((p) => p.string === 6 && p.fret === 2)).toBe(true);
    expect(fs.every((p) => noteAtPosition(p.string, p.fret, STANDARD_OPEN_MIDI).pitchClass === 6)).toBe(true);
  });

  it("recalculates notes when tuning changes", () => {
    const dropD = TUNINGS["drop-d"].openMidi;
    expect(noteAtPosition(6, 0, dropD).name).toBe("D");
    expect(noteAtPosition(6, 2, dropD).name).toBe("E");
    expect(resolveOpenMidi("half-step-down")[0]).toBe(39);
  });
});

describe("answer validation", () => {
  it("accepts enharmonic identify answers", () => {
    const q = {
      kind: "identify" as const,
      prompt: "",
      target: { string: 6 as const, fret: 2 },
      choices: ["F", "F♯", "G"],
      correctName: "F♯",
    };
    expect(validateIdentify(q, "F♯").correct).toBe(true);
    expect(validateIdentify(q, "G♭").correct).toBe(true);
    expect(validateIdentify(q, "G").correct).toBe(false);
  });

  it("validates find / find-all sets", () => {
    const valid = [
      { string: 6 as const, fret: 5 },
      { string: 5 as const, fret: 0 },
      { string: 4 as const, fret: 7 },
    ];
    const findQ = {
      kind: "find" as const,
      prompt: "",
      pitchClass: 9,
      noteName: "A",
      requiredString: null,
      valid,
      requiredCount: 1,
    };
    expect(validateFind(findQ, [{ string: 5, fret: 0 }]).correct).toBe(true);
    expect(validateFind(findQ, [{ string: 6, fret: 0 }]).correct).toBe(false);

    const allQ = { kind: "find-all" as const, prompt: "", pitchClass: 9, noteName: "A", valid };
    expect(validateFindAll(allQ, valid).correct).toBe(true);
    expect(validateFindAll(allQ, valid.slice(0, 2)).correct).toBe(false);
    expect(validateFindAll(allQ, [...valid, { string: 1, fret: 0 }]).correct).toBe(false);
  });
});

describe("mastery / curriculum", () => {
  it("does not master after a single correct answer", () => {
    let m = applyRecall(undefined, "6-0", true, 800);
    expect(m.state).not.toBe("mastered");
    m = applyRecall(m, "6-0", true, 700);
    expect(m.state).not.toBe("mastered");
  });

  it("schedules due reviews after failures", () => {
    const m = applyRecall(emptyMastery("6-3"), "6-3", false, null);
    expect(isDue(m)).toBe(true);
    expect(m.streak).toBe(0);
  });

  it("unlocks stages from mastery, not session count", () => {
    const map: Record<string, PositionMastery> = {};
    expect(stageUnlocked(map, 1)).toBe(true);
    expect(stageUnlocked(map, 2)).toBe(false);
    expect(highestUnlockedStage(map)).toBe(1);
  });
});

describe("fretboard scoring", () => {
  it("penalizes hints and never rewards wrong answers for speed alone", () => {
    const unaided = scoreFretboard(Array.from({ length: 10 }, () => ({ correct: true, reactionMs: 2000, usedHint: false })));
    const hinted = scoreFretboard(Array.from({ length: 10 }, () => ({ correct: true, reactionMs: 500, usedHint: true })));
    const wrongFast = scoreFretboard(Array.from({ length: 10 }, () => ({ correct: false, reactionMs: 200, usedHint: false })));
    expect(unaided.score).toBeGreaterThan(hinted.score);
    expect(wrongFast.score).toBeLessThan(30);
  });
});
