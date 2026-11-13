import { clamp } from "@/lib/utils";
import type { MasteryState, PositionKey, PositionMastery, FretPosition } from "../types";
import { positionKey } from "../types";

const MIN_EASE = 1.3;

export function emptyMastery(key: PositionKey): PositionMastery {
  return {
    key,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    avgReactionMs: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    state: "new",
    ease: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    streak: 0,
  };
}

function addDaysIso(from: Date, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * SM-2 inspired update. Mastery requires repeated success across growing intervals —
 * a single correct answer never marks a position mastered.
 */
export function applyRecall(
  current: PositionMastery | undefined,
  key: PositionKey,
  correct: boolean,
  reactionMs: number | null,
  now = new Date(),
): PositionMastery {
  const m = current ? { ...current } : emptyMastery(key);
  m.attempts += 1;
  m.lastAttemptAt = now.toISOString();

  if (correct) {
    m.correct += 1;
    m.streak += 1;
    m.lastSuccessAt = now.toISOString();
    if (reactionMs != null && reactionMs > 0) {
      m.avgReactionMs = m.avgReactionMs === 0 ? reactionMs : m.avgReactionMs * 0.7 + reactionMs * 0.3;
    }

    if (m.streak === 1) {
      m.intervalDays = 1;
      m.state = "learning";
    } else if (m.streak === 2) {
      m.intervalDays = 3;
      m.state = "practicing";
    } else {
      m.intervalDays = Math.max(1, Math.round(m.intervalDays * m.ease));
      m.state = m.intervalDays >= 14 && m.streak >= 4 ? "mastered" : m.intervalDays >= 6 ? "reviewing" : "practicing";
    }
    m.ease = Math.max(MIN_EASE, m.ease + 0.1);
    m.nextReviewAt = addDaysIso(now, m.intervalDays);
  } else {
    m.incorrect += 1;
    m.streak = 0;
    m.ease = Math.max(MIN_EASE, m.ease - 0.2);
    m.intervalDays = 0;
    m.state = m.attempts <= 2 ? "learning" : "practicing";
    m.nextReviewAt = addDaysIso(now, 0); // due immediately
  }

  return m;
}

export function isDue(m: PositionMastery, now = new Date()) {
  if (m.state === "new" || m.nextReviewAt == null) return true;
  return new Date(m.nextReviewAt).getTime() <= now.getTime();
}

export function masteryScore(m: PositionMastery) {
  if (m.attempts === 0) return 0;
  const accuracy = m.correct / m.attempts;
  const stateBonus: Record<MasteryState, number> = {
    new: 0,
    learning: 0.2,
    practicing: 0.45,
    reviewing: 0.7,
    mastered: 1,
  };
  return clamp(accuracy * 0.55 + stateBonus[m.state] * 0.45, 0, 1);
}

export function heatTone(m: PositionMastery | undefined): "grey" | "red" | "yellow" | "green" {
  if (!m || m.attempts === 0) return "grey";
  if (m.state === "mastered") return "green";
  const acc = m.correct / m.attempts;
  if (acc < 0.55 || m.state === "learning") return "red";
  return "yellow";
}

export function weakestStrings(
  map: Record<string, PositionMastery>,
  strings: number[] = [6, 5, 4, 3, 2, 1],
) {
  return strings
    .map((string) => {
      const items = Object.values(map).filter((m) => m.key.startsWith(`${string}-`) && m.attempts > 0);
      const score = items.length ? items.reduce((s, m) => s + masteryScore(m), 0) / items.length : 0;
      return { string, score, samples: items.length };
    })
    .sort((a, b) => a.score - b.score || b.samples - a.samples);
}

export function countMastered(map: Record<string, PositionMastery>) {
  return Object.values(map).filter((m) => m.state === "mastered").length;
}

export function applyRecalls(
  map: Record<string, PositionMastery>,
  positions: FretPosition[],
  correct: boolean,
  reactionMs: number | null,
  now = new Date(),
) {
  const next = { ...map };
  for (const p of positions) {
    const key = positionKey(p);
    next[key] = applyRecall(next[key], key, correct, reactionMs, now);
  }
  return next;
}
