import { pick } from "@/lib/utils";
import type { AccidentalPreference } from "@/types";
import type {
  FretboardMode,
  FretboardQuestion,
  FretPosition,
  GuitarString,
  PositionMastery,
} from "../types";
import { positionKey } from "../types";
import { STAGES, type StageDef } from "./curriculum";
import { isDue, masteryScore } from "./mastery";
import {
  findPositions,
  noteAt,
  octaveShapeTargets,
  pitchClassName,
} from "./note-calculator";
import { STRING_LABELS } from "./tuning";

const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];

export interface GeneratorContext {
  openMidi: readonly [number, number, number, number, number, number];
  preference: AccidentalPreference;
  stage: StageDef;
  mode: FretboardMode;
  mastery: Record<string, PositionMastery>;
  enabledStrings: GuitarString[];
  minFret: number;
  maxFret: number;
  /** Avoid immediate repeats. */
  recentKeys?: string[];
}

function poolPositions(ctx: GeneratorContext): FretPosition[] {
  const strings = ctx.stage.strings.filter((s) => ctx.enabledStrings.includes(s));
  const minFret = Math.max(ctx.minFret, ctx.stage.minFret);
  const maxFret = Math.min(ctx.maxFret, ctx.stage.maxFret);
  const out: FretPosition[] = [];
  for (const string of strings) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      const note = noteAt({ string, fret }, ctx.openMidi, ctx.preference);
      if (ctx.stage.naturalsOnly && !NATURAL_PCS.includes(note.pitchClass)) continue;
      out.push({ string, fret });
    }
  }
  return out;
}

/** Prefer due / weak / new items, with a sprinkle of random review. */
function weightedPick(pool: FretPosition[], mastery: Record<string, PositionMastery>, recent: string[] = []): FretPosition {
  const scored = pool.map((p) => {
    const key = positionKey(p);
    const m = mastery[key];
    let weight = 1;
    if (!m || m.attempts === 0) weight = 8;
    else if (isDue(m)) weight = 10;
    else weight = 2 + (1 - masteryScore(m)) * 8;
    if (recent.includes(key)) weight *= 0.15;
    return { p, weight };
  });
  const total = scored.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of scored) {
    r -= item.weight;
    if (r <= 0) return item.p;
  }
  return scored[scored.length - 1].p;
}

function choiceSet(correct: string, preference: AccidentalPreference, chromatic: boolean) {
  const naturals = ["C", "D", "E", "F", "G", "A", "B"];
  const all = Array.from({ length: 12 }, (_, i) => pitchClassName(i, preference));
  const pool = chromatic ? all : naturals;
  const others = pool.filter((n) => n !== correct);
  const picks: string[] = [correct];
  while (picks.length < Math.min(6, pool.length)) {
    const next = pick(others.filter((n) => !picks.includes(n)));
    picks.push(next);
  }
  // Shuffle
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks;
}

export function generateQuestion(ctx: GeneratorContext): FretboardQuestion {
  const pool = poolPositions(ctx);
  if (pool.length === 0) {
    // Fallback to open low E
    const target = { string: 6 as GuitarString, fret: 0 };
    const note = noteAt(target, ctx.openMidi, ctx.preference);
    return {
      kind: "identify",
      prompt: `What note is on the ${STRING_LABELS[6]} string, open?`,
      target,
      choices: choiceSet(note.name, ctx.preference, false),
      correctName: note.name,
    };
  }

  const resolved: Exclude<FretboardMode, "challenge"> =
    ctx.mode === "challenge" ? pick(["identify", "find", "octave"] as const) : ctx.mode;
  const challenge = ctx.mode === "challenge";

  if (resolved === "identify") {
    const target = weightedPick(pool, ctx.mastery, ctx.recentKeys);
    const note = noteAt(target, ctx.openMidi, ctx.preference);
    const chromatic = ctx.stage.stage >= 2 && !ctx.stage.naturalsOnly;
    return {
      kind: challenge ? "challenge-identify" : "identify",
      prompt:
        target.fret === 0
          ? `What note is the open ${STRING_LABELS[target.string]} string?`
          : `What note is on string ${target.string} (${STRING_LABELS[target.string]}), fret ${target.fret}?`,
      target,
      choices: choiceSet(note.name, ctx.preference, chromatic || challenge),
      correctName: note.name,
    };
  }

  if (resolved === "find") {
    const seed = weightedPick(pool, ctx.mastery, ctx.recentKeys);
    const note = noteAt(seed, ctx.openMidi, ctx.preference);
    const strings = ctx.stage.strings.filter((s) => ctx.enabledStrings.includes(s));
    const restrictString = ctx.stage.stage <= 2 && Math.random() < 0.45 ? seed.string : null;
    const valid = findPositions(note.pitchClass, ctx.openMidi, {
      strings: restrictString ? [restrictString] : strings,
      minFret: Math.max(ctx.minFret, ctx.stage.minFret),
      maxFret: Math.min(ctx.maxFret, ctx.stage.maxFret),
    });
    return {
      kind: challenge ? "challenge-find" : "find",
      prompt: restrictString
        ? `Find ${note.name} on the ${STRING_LABELS[restrictString]} string.`
        : `Find ${note.name} anywhere on the fretboard.`,
      pitchClass: note.pitchClass,
      noteName: note.name,
      requiredString: restrictString,
      valid,
      requiredCount: 1,
    };
  }

  if (resolved === "find-all") {
    const seed = weightedPick(pool, ctx.mastery, ctx.recentKeys);
    const note = noteAt(seed, ctx.openMidi, ctx.preference);
    const valid = findPositions(note.pitchClass, ctx.openMidi, {
      strings: ctx.stage.strings.filter((s) => ctx.enabledStrings.includes(s)),
      minFret: Math.max(ctx.minFret, ctx.stage.minFret),
      maxFret: Math.min(ctx.maxFret, ctx.stage.maxFret),
    });
    return {
      kind: "find-all",
      prompt: `Select every ${note.name} between frets ${Math.max(ctx.minFret, ctx.stage.minFret)} and ${Math.min(ctx.maxFret, ctx.stage.maxFret)}.`,
      pitchClass: note.pitchClass,
      noteName: note.name,
      valid,
    };
  }

  if (resolved === "octave") {
    // Prefer references that have at least one shape target in range.
    const candidates = pool.filter((p) => octaveShapeTargets(p, Math.min(ctx.maxFret, ctx.stage.maxFret)).length > 0);
    const ref = weightedPick(candidates.length ? candidates : pool, ctx.mastery, ctx.recentKeys);
    const shapes = octaveShapeTargets(ref, Math.min(ctx.maxFret, ctx.stage.maxFret));
    const note = noteAt(ref, ctx.openMidi, ctx.preference);
    const valid = shapes.map((s) => s.target);
    // Also accept any +12 semitone position in range
    const allOctaves = findPositions(note.pitchClass, ctx.openMidi, {
      strings: ctx.stage.strings.filter((s) => ctx.enabledStrings.includes(s)),
      minFret: Math.max(ctx.minFret, ctx.stage.minFret),
      maxFret: Math.min(ctx.maxFret, ctx.stage.maxFret),
    }).filter((p) => !(p.string === ref.string && p.fret === ref.fret));
    const explanation = shapes[0]?.label ?? "Same pitch class, one octave away.";
    return {
      kind: challenge ? "challenge-octave" : "octave",
      prompt: `Find an octave of ${note.name} from string ${ref.string}, fret ${ref.fret}.`,
      reference: ref,
      valid: valid.length ? valid : allOctaves,
      explanation,
    };
  }

  // play
  const target = weightedPick(pool, ctx.mastery, ctx.recentKeys);
  const note = noteAt(target, ctx.openMidi, ctx.preference);
  return {
    kind: "play",
    prompt: `Play ${note.fullName} at string ${target.string}, fret ${target.fret} on your guitar.`,
    target,
    targetMidi: note.midi,
    noteName: note.name,
  };
}

export function defaultStageForMode(mode: FretboardMode, unlocked: number): StageDef {
  const stage = STAGES[Math.min(unlocked, STAGES.length) - 1];
  if (stage.modes.includes(mode as StageDef["modes"][number])) return stage;
  // Fall back to highest stage that supports the mode
  for (let i = unlocked - 1; i >= 0; i--) {
    if (STAGES[i].modes.includes(mode as StageDef["modes"][number])) return STAGES[i];
  }
  return STAGES[0];
}
