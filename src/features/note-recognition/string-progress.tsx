"use client";

import { Check, Lock } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { stringProgressSummary, type NoteMasteryMap } from "./progression";

export function StringProgressPanel({
  mastery,
  activeStrings,
  focusString,
}: {
  mastery: NoteMasteryMap;
  activeStrings: number[];
  focusString: number | null;
}) {
  const rows = stringProgressSummary(mastery);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[12px] text-muted">Guitar strings</label>
        <span className="text-[11px] text-subtle">Unlock by accuracy, not attempt count alone</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((row) => {
          const active = activeStrings.includes(row.string);
          const focused = focusString === row.string;
          return (
            <div
              key={row.string}
              className={cn(
                "rounded-[10px] border px-3 py-2.5",
                !row.unlocked && "border-line bg-elevated/30 opacity-70",
                row.unlocked && !row.mastered && "border-line bg-bg",
                row.mastered && "border-success/40 bg-success/10",
                focused && "border-accent bg-accent/10",
                active && row.unlocked && !focused && "border-line-strong",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium">
                  {row.string} · {row.label}
                </span>
                {!row.unlocked ? (
                  <Lock className="size-3.5 text-subtle" aria-label="Locked" />
                ) : row.mastered ? (
                  <Check className="size-3.5 text-success" aria-label="Mastered" />
                ) : null}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {!row.unlocked
                  ? "Locked"
                  : row.mastered
                    ? `Mastered · frets 0–${row.maxFret}`
                    : `Frets 0–${row.maxFret} · ${
                        row.recentAccuracy != null
                          ? formatPercent(row.recentAccuracy)
                          : row.accuracy != null
                            ? formatPercent(row.accuracy)
                            : "new"
                      }`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
