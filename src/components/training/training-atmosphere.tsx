import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONE_GLOW = {
  orange:
    "bg-[radial-gradient(ellipse_at_15%_-5%,color-mix(in_srgb,var(--orange)_22%,transparent),transparent_50%),radial-gradient(ellipse_at_90%_10%,color-mix(in_srgb,var(--coral)_10%,transparent),transparent_45%)]",
  violet:
    "bg-[radial-gradient(ellipse_at_15%_-5%,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_50%),radial-gradient(ellipse_at_90%_10%,color-mix(in_srgb,var(--blue)_12%,transparent),transparent_45%)]",
  cyan:
    "bg-[radial-gradient(ellipse_at_15%_-5%,color-mix(in_srgb,var(--cyan)_20%,transparent),transparent_50%),radial-gradient(ellipse_at_90%_10%,color-mix(in_srgb,var(--blue)_12%,transparent),transparent_45%)]",
  blue:
    "bg-[radial-gradient(ellipse_at_15%_-5%,color-mix(in_srgb,var(--blue)_20%,transparent),transparent_50%),radial-gradient(ellipse_at_90%_10%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_45%)]",
  coral:
    "bg-[radial-gradient(ellipse_at_15%_-5%,color-mix(in_srgb,var(--coral)_20%,transparent),transparent_50%),radial-gradient(ellipse_at_90%_10%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_45%)]",
} as const;

export type AtmosphereTone = keyof typeof TONE_GLOW;

export function TrainingAtmosphere({
  tone,
  children,
  className,
}: {
  tone: AtmosphereTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn("pointer-events-none absolute inset-x-0 -top-6 h-[280px] sm:h-[320px]", TONE_GLOW[tone])} />
      <div className="relative">{children}</div>
    </div>
  );
}
