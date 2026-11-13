"use client";

import { cn } from "@/lib/utils";

export function MicMeter({
  level,
  peak,
  gate,
  className,
}: {
  level: number;
  peak: number;
  gate: number;
  className?: string;
}) {
  const pct = Math.min(1, level * 8);
  const peakPct = Math.min(1, peak * 8);
  const gatePct = Math.min(1, gate * 8);
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-elevated", className)} role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
      <div className="absolute inset-y-0 left-0 bg-success/80 transition-[width] duration-75" style={{ width: `${pct * 100}%` }} />
      <div className="absolute top-0 bottom-0 w-0.5 bg-warning" style={{ left: `${gatePct * 100}%` }} title="Noise gate" />
      <div className="absolute top-0 bottom-0 w-0.5 bg-fg/50" style={{ left: `${peakPct * 100}%` }} title="Peak" />
    </div>
  );
}
