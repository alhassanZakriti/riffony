"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-accent bg-accent" : "border-line-strong bg-elevated",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full transition-transform",
          checked ? "translate-x-[19px] bg-accent-fg" : "translate-x-[3px] bg-muted",
        )}
      />
    </button>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  format?: (v: number) => ReactNode;
  className?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <input
        type="range"
        className="range w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
      {format && <span className="tabular w-16 shrink-0 text-right text-[13px] text-muted">{format(value)}</span>}
    </div>
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 rounded-[10px] border border-line bg-bg px-3 text-[13px] text-fg outline-none hover:border-line-strong focus-visible:border-accent",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Kbd({ children, className, size = "md" }: { children: ReactNode; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded-[6px] border border-line-strong bg-elevated font-mono font-medium text-fg shadow-[0_1px_0_var(--line-strong)]",
        size === "sm" && "h-5 min-w-5 px-1 text-[11px]",
        size === "md" && "h-7 min-w-7 px-2 text-[12px]",
        size === "lg" && "h-12 min-w-12 px-4 text-lg",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "error" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "border-line text-muted",
    accent: "border-accent/30 bg-accent/10 text-accent",
    success: "border-success/30 bg-success/10 text-success",
    error: "border-error/30 bg-error/10 text-error",
    warning: "border-warning/30 bg-warning/10 text-warning",
  };
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, className, tone = "accent", label }: { value: number; className?: string; tone?: "accent" | "success" | "fg"; label: string }) {
  const tones = { accent: "bg-accent", success: "bg-success", fg: "bg-fg" };
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-elevated", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-300", tones[tone])} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 56, stroke = 5, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--elevated)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[10px] bg-elevated", className)} />;
}

export function Field({ label, description, children, className }: { label: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8", className)}>
      <div className="min-w-0">
        <div className="text-[14px] text-fg">{label}</div>
        {description && <div className="mt-0.5 text-[13px] text-muted">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
