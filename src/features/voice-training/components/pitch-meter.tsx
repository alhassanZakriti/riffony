"use client";

import { cn, clamp } from "@/lib/utils";

/**
 * Visual pitch meter: target line at center, live pitch as a moving marker.
 * Negative cents = flat (left/down), positive = sharp (right/up).
 */
export function PitchMeter({
  signedCents,
  toleranceCents,
  active,
  className,
}: {
  signedCents: number | null;
  toleranceCents: number;
  active?: boolean;
  className?: string;
}) {
  const span = Math.max(toleranceCents * 2.5, 100);
  const x =
    signedCents == null ? 50 : clamp(50 + (signedCents / span) * 50, 4, 96);
  const inTune = signedCents != null && Math.abs(signedCents) <= toleranceCents;

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="relative h-14 overflow-hidden rounded-[14px] border border-line/80 bg-bg/80">
        <div
          className="absolute inset-y-2 rounded-[10px] bg-cyan/15"
          style={{
            left: `${50 - (toleranceCents / span) * 50}%`,
            right: `${50 - (toleranceCents / span) * 50}%`,
          }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-cyan" />
        <div
          className={cn(
            "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-[left,background-color] duration-75",
            active && signedCents != null
              ? inTune
                ? "border-lime bg-lime"
                : "border-orange bg-orange"
              : "border-subtle bg-elevated",
          )}
          style={{ left: `${x}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-subtle">
        <span>Flat</span>
        <span>Target</span>
        <span>Sharp</span>
      </div>
    </div>
  );
}
