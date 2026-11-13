import { enharmonicEqual, includesPosition, positionsEqual } from "./note-calculator";
import type { FretboardQuestion, FretPosition } from "../types";

export interface ValidationResult {
  correct: boolean;
  detail: string;
  /** Positions to credit for spaced repetition (usually targets / valid set). */
  masteryPositions: FretPosition[];
  revealed: FretPosition[];
}

export function validateIdentify(q: Extract<FretboardQuestion, { kind: "identify" | "challenge-identify" }>, answer: string): ValidationResult {
  const correct = enharmonicEqual(answer, q.correctName);
  return {
    correct,
    detail: correct ? `${q.correctName} is correct.` : `Correct answer: ${q.correctName}.`,
    masteryPositions: [q.target],
    revealed: [q.target],
  };
}

export function validateFind(
  q: Extract<FretboardQuestion, { kind: "find" | "challenge-find" }>,
  selected: FretPosition[],
): ValidationResult {
  const unique = dedupe(selected);
  const hits = unique.filter((p) => includesPosition(q.valid, p));
  const misses = unique.filter((p) => !includesPosition(q.valid, p));
  const correct = hits.length >= q.requiredCount && misses.length === 0;
  return {
    correct,
    detail: correct
      ? `Found ${hits.length} valid ${q.noteName} position${hits.length === 1 ? "" : "s"}.`
      : misses.length
        ? `Incorrect selection. Valid ${q.noteName} positions are highlighted.`
        : `Need ${q.requiredCount} valid location${q.requiredCount === 1 ? "" : "s"} of ${q.noteName}.`,
    masteryPositions: correct ? hits : q.valid.slice(0, 1),
    revealed: q.valid,
  };
}

export function validateFindAll(
  q: Extract<FretboardQuestion, { kind: "find-all" }>,
  selected: FretPosition[],
): ValidationResult {
  const unique = dedupe(selected);
  const found = unique.filter((p) => includesPosition(q.valid, p));
  const extras = unique.filter((p) => !includesPosition(q.valid, p));
  const missing = q.valid.filter((p) => !includesPosition(unique, p));
  const correct = missing.length === 0 && extras.length === 0;
  return {
    correct,
    detail: correct
      ? `All ${q.valid.length} ${q.noteName} positions found.`
      : `Found ${found.length}/${q.valid.length}. Missing ${missing.length}, extras ${extras.length}.`,
    masteryPositions: q.valid,
    revealed: q.valid,
  };
}

export function validateOctave(
  q: Extract<FretboardQuestion, { kind: "octave" | "challenge-octave" }>,
  selected: FretPosition,
): ValidationResult {
  const correct = includesPosition(q.valid, selected);
  return {
    correct,
    detail: correct ? `Octave found. ${q.explanation}` : `Not an octave of the reference. ${q.explanation}`,
    masteryPositions: [q.reference, ...(correct ? [selected] : q.valid.slice(0, 1))],
    revealed: [q.reference, ...q.valid],
  };
}

function dedupe(list: FretPosition[]) {
  const out: FretPosition[] = [];
  for (const p of list) if (!out.some((x) => positionsEqual(x, p))) out.push(p);
  return out;
}
