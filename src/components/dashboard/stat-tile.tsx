import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  className,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  tone?: "neutral" | "violet" | "cyan" | "orange" | "lime";
}) {
  const accents = {
    neutral: "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--elevated)_55%,transparent),transparent)]",
    violet: "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)]",
    cyan: "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--cyan)_14%,transparent),transparent)]",
    orange: "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orange)_14%,transparent),transparent)]",
    lime: "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--lime)_14%,transparent),transparent)]",
  };

  return (
    <div className={cn("rounded-[16px] border border-line/80 bg-surface/70 px-4 py-4", accents[tone], className)}>
      <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-2 tabular font-display text-[26px] font-semibold tracking-tight text-fg">{value}</div>
      {hint && <div className="mt-1.5 text-[12px] text-subtle">{hint}</div>}
    </div>
  );
}
