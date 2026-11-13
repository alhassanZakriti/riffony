import type { Category, ExerciseId, SessionRecord, Tier } from "@/types";

export const TIERS: readonly Tier[] = [0, 1, 2, 3];
export const TIER_NAMES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

/**
 * A tier unlocks after this many qualifying sessions at the previous tier.
 * Both score and accuracy are required so progression reflects real performance.
 */
export const UNLOCK_RULE = { score: 80, accuracy: 0.85, sessions: 2 } as const;

export function qualifyingSessions(sessions: SessionRecord[], category: Category, tier: Tier) {
  return sessions.filter(
    (s) =>
      s.category === category &&
      s.tier === tier &&
      s.score >= UNLOCK_RULE.score &&
      s.accuracy >= UNLOCK_RULE.accuracy,
  ).length;
}

export function highestUnlockedTier(sessions: SessionRecord[], category: Category): Tier {
  let tier: Tier = 0;
  while (tier < 3 && qualifyingSessions(sessions, category, tier) >= UNLOCK_RULE.sessions) tier = (tier + 1) as Tier;
  return tier;
}

export interface TierProgress {
  current: Tier;
  next: Tier | null;
  qualifying: number;
  needed: number;
}

export function tierProgress(sessions: SessionRecord[], category: Category): TierProgress {
  const current = highestUnlockedTier(sessions, category);
  if (current === 3) return { current, next: null, qualifying: UNLOCK_RULE.sessions, needed: UNLOCK_RULE.sessions };
  return {
    current,
    next: (current + 1) as Tier,
    qualifying: Math.min(UNLOCK_RULE.sessions, qualifyingSessions(sessions, category, current)),
    needed: UNLOCK_RULE.sessions,
  };
}

export function bestScoreForTier(
  sessions: SessionRecord[],
  exercise: ExerciseId,
): Partial<Record<Tier, number>> {
  const out: Partial<Record<Tier, number>> = {};
  for (const s of sessions) {
    if (s.exercise !== exercise) continue;
    const prev = out[s.tier];
    if (prev == null || s.score > prev) out[s.tier] = s.score;
  }
  return out;
}

export function unlockHint(target: Tier): string {
  if (target === 0) return "Always available.";
  const prev = (target - 1) as Tier;
  return `Complete ${TIER_NAMES[prev]} with score ≥${UNLOCK_RULE.score} and ≥${Math.round(UNLOCK_RULE.accuracy * 100)}% accuracy twice to unlock ${TIER_NAMES[target]}.`;
}
