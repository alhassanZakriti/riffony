import type { CurriculumStage, GuitarString, PositionMastery } from "../types";
import { positionKey } from "../types";
import { masteryScore } from "./mastery";

export interface StageDef {
  stage: CurriculumStage;
  title: string;
  description: string;
  strings: GuitarString[];
  minFret: number;
  maxFret: number;
  /** When true, only natural pitch classes (no sharps/flats) for early drills. */
  naturalsOnly: boolean;
  /** Modes unlocked at this stage. */
  modes: Array<"identify" | "find" | "find-all" | "octave" | "challenge" | "play">;
}

export const STAGES: StageDef[] = [
  {
    stage: 1,
    title: "Foundations",
    description: "Open strings, fret numbering, and natural notes on the low E string.",
    strings: [6],
    minFret: 0,
    maxFret: 12,
    naturalsOnly: true,
    modes: ["identify", "find"],
  },
  {
    stage: 2,
    title: "Low E & A",
    description: "Master every note on strings 6 and 5 between frets 0–12.",
    strings: [6, 5],
    minFret: 0,
    maxFret: 12,
    naturalsOnly: false,
    modes: ["identify", "find", "find-all"],
  },
  {
    stage: 3,
    title: "D & G",
    description: "Add strings 4 and 3, with octave links from E and A.",
    strings: [6, 5, 4, 3],
    minFret: 0,
    maxFret: 12,
    naturalsOnly: false,
    modes: ["identify", "find", "find-all", "octave"],
  },
  {
    stage: 4,
    title: "B & High E",
    description: "Complete the neck with the G–B tuning exception.",
    strings: [6, 5, 4, 3, 2, 1],
    minFret: 0,
    maxFret: 12,
    naturalsOnly: false,
    modes: ["identify", "find", "find-all", "octave"],
  },
  {
    stage: 5,
    title: "Complete Fretboard",
    description: "Interleaved recognition, location, all-occurrences, and octaves.",
    strings: [6, 5, 4, 3, 2, 1],
    minFret: 0,
    maxFret: 12,
    naturalsOnly: false,
    modes: ["identify", "find", "find-all", "octave", "challenge"],
  },
  {
    stage: 6,
    title: "Mastery",
    description: "Full-neck challenge and optional play-on-guitar drills.",
    strings: [6, 5, 4, 3, 2, 1],
    minFret: 0,
    maxFret: 12,
    naturalsOnly: false,
    modes: ["identify", "find", "find-all", "octave", "challenge", "play"],
  },
];

export function stagePositions(stage: StageDef) {
  const out: { string: GuitarString; fret: number }[] = [];
  for (const string of stage.strings) {
    for (let fret = stage.minFret; fret <= stage.maxFret; fret++) {
      out.push({ string, fret });
    }
  }
  return out;
}

/** Unlock next stage when ≥70% of prior-stage positions score ≥0.55 with ≥2 attempts. */
export function stageUnlocked(map: Record<string, PositionMastery>, stage: CurriculumStage): boolean {
  if (stage === 1) return true;
  const prev = STAGES[stage - 2];
  const positions = stagePositions(prev);
  if (positions.length === 0) return true;
  let ready = 0;
  for (const p of positions) {
    const m = map[positionKey(p)];
    if (m && m.attempts >= 2 && masteryScore(m) >= 0.55) ready++;
  }
  return ready / positions.length >= 0.7;
}

export function highestUnlockedStage(map: Record<string, PositionMastery>): CurriculumStage {
  let stage: CurriculumStage = 1;
  for (const s of STAGES) {
    if (stageUnlocked(map, s.stage)) stage = s.stage;
    else break;
  }
  return stage;
}

export function stageProgress(map: Record<string, PositionMastery>, stage: CurriculumStage) {
  const def = STAGES[stage - 1];
  const positions = stagePositions(def);
  let sum = 0;
  let mastered = 0;
  for (const p of positions) {
    const m = map[positionKey(p)];
    const score = m ? masteryScore(m) : 0;
    sum += score;
    if (m?.state === "mastered") mastered++;
  }
  return {
    average: positions.length ? sum / positions.length : 0,
    mastered,
    total: positions.length,
  };
}
