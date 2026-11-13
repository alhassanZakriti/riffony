"use client";

import { Check, Lock } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { TIER_NAMES, TIERS, UNLOCK_RULE, type TierProgress } from "@/features/gamification/tiers";
import { cn } from "@/lib/utils";
import type { Tier } from "@/types";

export function TierSelector({
  value,
  unlocked,
  onChange,
  bestByTier,
  progress,
  label = "Difficulty",
}: {
  value: Tier;
  unlocked: Tier;
  onChange: (t: Tier) => void;
  /** Best score per tier, if any. */
  bestByTier?: Partial<Record<Tier, number>>;
  progress?: TierProgress;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[12px] text-muted">{label}</label>
        {progress && progress.next != null && (
          <span className="text-[11px] text-subtle">
            Unlock {TIER_NAMES[progress.next]}: {progress.qualifying}/{progress.needed} sessions ≥{UNLOCK_RULE.score}{" "}
            score &amp; {Math.round(UNLOCK_RULE.accuracy * 100)}% accuracy
          </span>
        )}
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIERS.map((t) => {
          const isLocked = t > unlocked;
          const isSelected = t === value;
          const best = bestByTier?.[t];
          const completed = best != null && best >= UNLOCK_RULE.score;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isLocked || undefined}
              onClick={() => {
                if (isLocked) {
                  const prev = (t - 1) as Tier;
                  toast(
                    `Complete ${TIER_NAMES[prev]} with score ≥${UNLOCK_RULE.score} and ≥${Math.round(UNLOCK_RULE.accuracy * 100)}% accuracy twice to unlock ${TIER_NAMES[t]}.`,
                  );
                  return;
                }
                onChange(t);
              }}
              className={cn(
                "relative flex flex-col items-start gap-1 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
                isSelected && !isLocked && "border-accent bg-accent/10",
                !isSelected && !isLocked && "border-line bg-bg hover:border-line-strong",
                isLocked && "cursor-not-allowed border-line bg-elevated/40 opacity-70",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className={cn("text-[13px] font-medium", isLocked ? "text-subtle" : "text-fg")}>
                  {TIER_NAMES[t]}
                </span>
                {isLocked ? (
                  <Lock className="size-3.5 text-subtle" aria-hidden />
                ) : completed ? (
                  <Check className="size-3.5 text-success" aria-label="Completed" />
                ) : null}
              </div>
              <span className="text-[11px] text-muted">
                {isLocked
                  ? `Locked`
                  : best != null
                    ? `Best ${Math.round(best)}`
                    : t === 0
                      ? "Open"
                      : "Unlocked"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
