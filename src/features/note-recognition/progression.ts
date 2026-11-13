import { midiToNote, NATURAL_PITCH_CLASSES } from "@/lib/music/notes";
import { ALL_STRINGS, openMidiForString, STRING_LABELS } from "@/features/fretboard/engine/tuning";
import type { GuitarString } from "@/features/fretboard/types";
import type { Tier } from "@/types";
import { clamp, pick } from "@/lib/utils";

/** Order of introduction: low E → high E. */
export const STRING_UNLOCK_ORDER: GuitarString[] = [6, 5, 4, 3, 2, 1];

export interface StringMastery {
  attempts: number;
  correct: number;
  incorrect: number;
  streak: number;
  avgReactionMs: number;
  avgAbsCents: number;
  /** Rolling window of recent outcomes (1 correct / 0 incorrect), newest last. */
  recent: number[];
  unlocked: boolean;
  mastered: boolean;
  /** Highest fret band unlocked for this string (5 | 8 | 12). */
  maxFret: 5 | 8 | 12;
}

export type NoteMasteryMap = Partial<Record<GuitarString, StringMastery>>;

export interface NoteLessonConfig {
  tier: Tier;
  /** Active strings for this trial pool. */
  strings: GuitarString[];
  maxFret: number;
  naturalsOnly: boolean;
  showName: boolean;
  playReference: boolean;
  trialTimeoutMs: number;
  /** Focus string for single-string drills (null when mixing). */
  focusString: GuitarString | null;
  stageLabel: string;
  stageDetail: string;
  /** Inclusive MIDI range actually available. */
  midiMin: number;
  midiMax: number;
}

const RECENT_WINDOW = 16;
const UNLOCK_ACCURACY = 0.85;
const UNLOCK_MIN_ATTEMPTS = 12;
const MASTER_ACCURACY = 0.9;
const MASTER_MIN_ATTEMPTS = 20;
const MASTER_STREAK = 8;

export function emptyStringMastery(unlocked = false): StringMastery {
  return {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    streak: 0,
    avgReactionMs: 0,
    avgAbsCents: 0,
    recent: [],
    unlocked,
    mastered: false,
    maxFret: 5,
  };
}

export function ensureNoteMastery(map: NoteMasteryMap): NoteMasteryMap {
  const next: NoteMasteryMap = { ...map };
  for (const s of STRING_UNLOCK_ORDER) {
    if (!next[s]) next[s] = emptyStringMastery(s === 6);
  }
  // Always keep low E unlocked as the entry point.
  next[6] = { ...next[6]!, unlocked: true };
  return next;
}

function recentAccuracy(m: StringMastery) {
  if (m.recent.length === 0) return m.attempts ? m.correct / m.attempts : 0;
  return m.recent.reduce((a, b) => a + b, 0) / m.recent.length;
}

function maybeExpandFret(m: StringMastery): 5 | 8 | 12 {
  if (m.maxFret >= 12) return 12;
  if (m.maxFret === 8) {
    return m.attempts >= 14 && recentAccuracy(m) >= UNLOCK_ACCURACY ? 12 : 8;
  }
  return m.attempts >= 10 && recentAccuracy(m) >= UNLOCK_ACCURACY ? 8 : 5;
}

function qualifiesToUnlockNext(m: StringMastery) {
  if (m.attempts < UNLOCK_MIN_ATTEMPTS) return false;
  if (recentAccuracy(m) < UNLOCK_ACCURACY) return false;
  return m.streak >= 5 || m.correct / m.attempts >= UNLOCK_ACCURACY;
}

function qualifiesMastered(m: StringMastery) {
  if (m.attempts < MASTER_MIN_ATTEMPTS) return false;
  if (recentAccuracy(m) < MASTER_ACCURACY) return false;
  return m.streak >= MASTER_STREAK || (m.correct / m.attempts >= MASTER_ACCURACY && m.maxFret >= 8);
}

/** Apply one trial result and return updated mastery map (unlock / fret expand). */
export function applyNoteRecall(
  map: NoteMasteryMap,
  string: GuitarString,
  correct: boolean,
  reactionMs: number | null,
  absCents: number | null,
): NoteMasteryMap {
  const base = ensureNoteMastery(map);
  const cur = { ...base[string]! };
  cur.attempts += 1;
  if (correct) {
    cur.correct += 1;
    cur.streak += 1;
    if (reactionMs != null && reactionMs > 0) {
      cur.avgReactionMs = cur.avgReactionMs === 0 ? reactionMs : cur.avgReactionMs * 0.7 + reactionMs * 0.3;
    }
    if (absCents != null) {
      cur.avgAbsCents = cur.avgAbsCents === 0 ? absCents : cur.avgAbsCents * 0.7 + absCents * 0.3;
    }
  } else {
    cur.incorrect += 1;
    cur.streak = 0;
  }
  cur.recent = [...cur.recent, correct ? 1 : 0].slice(-RECENT_WINDOW);
  cur.maxFret = maybeExpandFret(cur);
  cur.mastered = qualifiesMastered(cur);

  const next = { ...base, [string]: cur };

  // Unlock the next string in order when the current focus string qualifies.
  const idx = STRING_UNLOCK_ORDER.indexOf(string);
  if (idx >= 0 && idx < STRING_UNLOCK_ORDER.length - 1 && qualifiesToUnlockNext(cur)) {
    const nxt = STRING_UNLOCK_ORDER[idx + 1];
    const existing = next[nxt] ?? emptyStringMastery(false);
    next[nxt] = { ...existing, unlocked: true };
  }

  return next;
}

export function unlockedStrings(map: NoteMasteryMap): GuitarString[] {
  const m = ensureNoteMastery(map);
  return STRING_UNLOCK_ORDER.filter((s) => m[s]?.unlocked);
}

export function masteredStrings(map: NoteMasteryMap): GuitarString[] {
  const m = ensureNoteMastery(map);
  return STRING_UNLOCK_ORDER.filter((s) => m[s]?.mastered);
}

/** Focus string for single-string drills: first unlocked, not-yet-mastered string. */
export function focusString(map: NoteMasteryMap): GuitarString {
  const m = ensureNoteMastery(map);
  for (const s of STRING_UNLOCK_ORDER) {
    if (m[s]?.unlocked && !m[s]?.mastered) return s;
  }
  // All mastered — cycle the weakest unlocked string.
  const unlocked = unlockedStrings(m);
  let weakest: GuitarString = unlocked[0] ?? 6;
  let worst = 2;
  for (const s of unlocked) {
    const acc = recentAccuracy(m[s]!);
    if (acc < worst) {
      worst = acc;
      weakest = s;
    }
  }
  return weakest;
}

function fretsForString(m: StringMastery, tier: Tier): number {
  const unlockedFret = m.maxFret;
  if (tier >= 3) return Math.max(unlockedFret, 12);
  if (tier >= 2) return Math.max(unlockedFret, 8);
  return unlockedFret;
}

/**
 * Build the lesson configuration for the current tier + string mastery.
 * Progression is mastery-driven within and across tiers — not XP alone.
 */
export function lessonFor(
  tier: Tier,
  mastery: NoteMasteryMap,
  openMidi: readonly [number, number, number, number, number, number],
): NoteLessonConfig {
  const map = ensureNoteMastery(mastery);
  const unlocked = unlockedStrings(map);
  const mastered = masteredStrings(map);
  const focus = focusString(map);

  let strings: GuitarString[];
  let focusStr: GuitarString | null;
  let stageLabel: string;
  let stageDetail: string;
  let naturalsOnly: boolean;
  let showName: boolean;
  let playReference: boolean;
  let trialTimeoutMs: number;

  if (tier === 0) {
    // Level 1–2: single string, expanding frets/octaves on that string.
    strings = [focus];
    focusStr = focus;
    const fret = fretsForString(map[focus]!, 0);
    stageLabel = fret <= 5 ? "Individual string" : "Expanded range";
    stageDetail = `${STRING_LABELS[focus]} · frets 0–${fret}`;
    naturalsOnly = true;
    showName = true;
    playReference = true;
    trialTimeoutMs = 8000;
  } else if (tier === 1) {
    // Level 3 start: mix two unlocked strings when possible.
    const pool = unlocked.length >= 2 ? unlocked.slice(0, Math.min(3, Math.max(2, mastered.length + 1))) : unlocked;
    strings = pool.length ? pool : [focus];
    focusStr = strings.length === 1 ? strings[0] : null;
    stageLabel = strings.length === 1 ? "Individual string" : "Multi-string";
    stageDetail =
      strings.length === 1
        ? `${STRING_LABELS[strings[0]]}`
        : `${strings.map((s) => STRING_LABELS[s]).join(" · ")}`;
    naturalsOnly = true;
    showName = true;
    playReference = true;
    trialTimeoutMs = 6500;
  } else if (tier === 2) {
    strings = unlocked.length >= 3 ? unlocked : unlocked.length ? unlocked : [focus];
    // Prefer all unlocked once ≥4 mastered.
    if (mastered.length >= 4) strings = unlocked;
    focusStr = null;
    stageLabel = strings.length >= 5 ? "Fretboard mix" : "Multi-string";
    stageDetail = `${strings.length} strings · frets expand with mastery`;
    naturalsOnly = false;
    showName = true;
    playReference = false;
    trialTimeoutMs = 5500;
  } else {
    strings = unlocked.length ? unlocked : ALL_STRINGS;
    // Expert uses every unlocked string; if all six unlocked, full board.
    if (unlocked.length >= 6) strings = ALL_STRINGS;
    focusStr = null;
    stageLabel = "Advanced recognition";
    stageDetail = "All unlocked strings · wider frets · fewer hints";
    naturalsOnly = false;
    showName = false;
    playReference = true;
    trialTimeoutMs = 4500;
  }

  const maxFret = Math.max(...strings.map((s) => fretsForString(map[s] ?? emptyStringMastery(true), tier)));
  const midis = poolMidis(openMidi, strings, maxFret, naturalsOnly);
  const midiMin = midis.length ? Math.min(...midis) : 40;
  const midiMax = midis.length ? Math.max(...midis) : 76;

  return {
    tier,
    strings,
    maxFret,
    naturalsOnly,
    showName,
    playReference,
    trialTimeoutMs,
    focusString: focusStr,
    stageLabel,
    stageDetail,
    midiMin,
    midiMax,
  };
}

export function poolMidis(
  openMidi: readonly [number, number, number, number, number, number],
  strings: GuitarString[],
  maxFret: number,
  naturalsOnly: boolean,
): number[] {
  const set = new Set<number>();
  for (const s of strings) {
    const open = openMidiForString(s, openMidi);
    for (let fret = 0; fret <= maxFret; fret++) {
      const midi = open + fret;
      const pc = ((midi % 12) + 12) % 12;
      if (naturalsOnly && !NATURAL_PITCH_CLASSES.includes(pc)) continue;
      set.add(midi);
    }
  }
  return [...set].sort((a, b) => a - b);
}

export interface WeightedTarget {
  midi: number;
  string: GuitarString;
  fret: number;
}

/** Pick a playable target, biasing toward due / weak notes on active strings. */
export function pickTarget(
  openMidi: readonly [number, number, number, number, number, number],
  lesson: NoteLessonConfig,
  mastery: NoteMasteryMap,
  avoidMidi?: number | null,
  rng: () => number = Math.random,
): WeightedTarget {
  const candidates: WeightedTarget[] = [];
  for (const s of lesson.strings) {
    const open = openMidiForString(s, openMidi);
    const maxFret = fretsForString(mastery[s] ?? emptyStringMastery(true), lesson.tier);
    for (let fret = 0; fret <= Math.min(maxFret, lesson.maxFret); fret++) {
      const midi = open + fret;
      const pc = ((midi % 12) + 12) % 12;
      if (lesson.naturalsOnly && !NATURAL_PITCH_CLASSES.includes(pc)) continue;
      if (avoidMidi != null && midi === avoidMidi) continue;
      candidates.push({ midi, string: s, fret });
    }
  }
  if (candidates.length === 0) {
    const s = lesson.strings[0] ?? 6;
    return { midi: openMidiForString(s, openMidi), string: s, fret: 0 };
  }

  // Weight: lower recent string accuracy → higher pick chance; open + low frets slightly favored early.
  const weights = candidates.map((c) => {
    const m = mastery[c.string];
    const acc = m && m.recent.length ? recentAccuracy(m) : 0.5;
    const weakness = 1.15 - clamp(acc, 0, 1);
    const fretBias = c.fret <= 5 ? 1.1 : c.fret <= 8 ? 1 : 0.85;
    return weakness * fretBias;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return pick(candidates, rng);
}

export function formatMidiRange(min: number, max: number) {
  return `${midiToNote(min).name}–${midiToNote(max).name}`;
}

export function stringProgressSummary(map: NoteMasteryMap) {
  const m = ensureNoteMastery(map);
  return STRING_UNLOCK_ORDER.map((s) => {
    const row = m[s]!;
    return {
      string: s,
      label: STRING_LABELS[s],
      unlocked: row.unlocked,
      mastered: row.mastered,
      accuracy: row.attempts ? row.correct / row.attempts : null,
      recentAccuracy: row.recent.length ? recentAccuracy(row) : null,
      maxFret: row.maxFret,
      attempts: row.attempts,
    };
  });
}
