import type { Tier } from "@/types";

export interface XpInput {
  score: number;
  tier: Tier;
  perfect: boolean;
  isPersonalBest: boolean;
  /** Average of the previous sessions of the same exercise, if any. */
  recentAverage: number | null;
  firstSessionToday: boolean;
  streakDays: number;
  achievementXp: number;
}

export function computeXp(i: XpInput) {
  const breakdown: { label: string; amount: number }[] = [];
  const performance = Math.round(i.score * 0.5 * (1 + 0.25 * i.tier));
  breakdown.push({ label: "Performance", amount: performance });
  if (i.perfect) breakdown.push({ label: "Perfect session", amount: 25 });
  if (i.isPersonalBest) breakdown.push({ label: "Personal record", amount: 15 });
  if (i.recentAverage != null && i.score > i.recentAverage) {
    const gain = Math.min(20, Math.round(i.score - i.recentAverage));
    if (gain > 0) breakdown.push({ label: "Improvement", amount: gain });
  }
  if (i.firstSessionToday && i.streakDays > 0) {
    breakdown.push({ label: `Daily streak (${i.streakDays} d)`, amount: 5 * Math.min(i.streakDays, 7) });
  }
  if (i.achievementXp > 0) breakdown.push({ label: "Achievements", amount: i.achievementXp });
  return { total: breakdown.reduce((s, b) => s + b.amount, 0), breakdown };
}

/** Cumulative XP required to reach `level` (level 1 starts at 0). */
export function xpForLevel(level: number) {
  return 50 * (level - 1) * level;
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, intoLevel: xp - floor, levelSpan: ceil - floor, progress: (xp - floor) / (ceil - floor) };
}
