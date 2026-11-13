import { describe, expect, it } from "vitest";
import { STANDARD_OPEN_MIDI } from "@/features/fretboard/engine/tuning";
import { midiToNote } from "@/lib/music/notes";
import {
  applyNoteRecall,
  emptyStringMastery,
  ensureNoteMastery,
  lessonFor,
  pickTarget,
  poolMidis,
  STRING_UNLOCK_ORDER,
} from "@/features/note-recognition/progression";
import { evaluateNote } from "@/lib/scoring/notes";

describe("note recognition progression", () => {
  it("includes pitches below and above the fourth octave on guitar", () => {
    const midis = poolMidis(STANDARD_OPEN_MIDI, [6, 1], 12, true);
    expect(midis).toContain(40); // E2 low E open
    expect(midis).toContain(64); // E4 high E open
    expect(Math.min(...midis)).toBeLessThan(60); // below C4
    expect(Math.max(...midis)).toBeGreaterThanOrEqual(64);
    expect(midiToNote(40).name).toBe("E2");
    expect(midiToNote(64).name).toBe("E4");
  });

  it("beginner lesson focuses a single unlocked string", () => {
    const mastery = ensureNoteMastery({});
    const lesson = lessonFor(0, mastery, STANDARD_OPEN_MIDI);
    expect(lesson.strings).toEqual([6]);
    expect(lesson.focusString).toBe(6);
    expect(lesson.maxFret).toBeLessThanOrEqual(5);
  });

  it("does not unlock the next string without accuracy", () => {
    let mastery = ensureNoteMastery({});
    for (let i = 0; i < 20; i++) {
      mastery = applyNoteRecall(mastery, 6, false, 800, 30);
    }
    expect(mastery[5]?.unlocked).toBeFalsy();
  });

  it("unlocks the next string after consistent accuracy", () => {
    let mastery = ensureNoteMastery({});
    for (let i = 0; i < 14; i++) {
      mastery = applyNoteRecall(mastery, 6, true, 500, 5);
    }
    expect(mastery[5]?.unlocked).toBe(true);
    expect(mastery[6]?.maxFret).toBeGreaterThanOrEqual(8);
  });

  it("only generates playable frets for the active strings", () => {
    const mastery = ensureNoteMastery({});
    const lesson = lessonFor(0, mastery, STANDARD_OPEN_MIDI);
    for (let i = 0; i < 40; i++) {
      const t = pickTarget(STANDARD_OPEN_MIDI, lesson, mastery, null, () => i / 40);
      expect(lesson.strings).toContain(t.string);
      expect(t.fret).toBeGreaterThanOrEqual(0);
      expect(t.fret).toBeLessThanOrEqual(lesson.maxFret);
      expect(t.midi).toBe(STANDARD_OPEN_MIDI[6 - t.string] + t.fret);
    }
  });

  it("requires the correct octave", () => {
    expect(evaluateNote(40, 40, false)).toBe("correct"); // E2
    expect(evaluateNote(40, 52, false)).toBe("octave"); // E3
    expect(evaluateNote(40, 52, true)).toBe("correct");
  });

  it("expert mixes unlocked strings once progression advances", () => {
    let mastery = ensureNoteMastery({});
    for (const s of STRING_UNLOCK_ORDER) {
      mastery[s] = {
        ...emptyStringMastery(true),
        unlocked: true,
        mastered: true,
        attempts: 24,
        correct: 22,
        streak: 10,
        maxFret: 12,
        recent: Array.from({ length: 16 }, () => 1),
      };
    }
    const lesson = lessonFor(3, mastery, STANDARD_OPEN_MIDI);
    expect(lesson.strings.length).toBe(6);
    expect(lesson.showName).toBe(false);
    expect(lesson.midiMax).toBeGreaterThanOrEqual(64);
  });
});
