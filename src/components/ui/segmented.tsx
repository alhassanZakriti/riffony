"use client";

import { Lock } from "lucide-react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  locked?: boolean;
  hint?: string;
}

/** Radio-group semantics with roving focus and arrow-key navigation. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = "md",
  className,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (!o.disabled && !o.locked ? i : -1)).filter((i) => i >= 0);

  const onKey = (e: KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const pos = enabled.indexOf(index);
    const next = enabled[(pos + dir + enabled.length) % enabled.length];
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex flex-wrap gap-1 rounded-[11px] border border-line bg-bg p-1", className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        const unavailable = o.disabled || o.locked;
        return (
          <button
            key={`${id}-${o.value}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={unavailable || undefined}
            title={o.hint}
            tabIndex={selected ? 0 : -1}
            onClick={() => !unavailable && onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[8px] font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
              selected ? "bg-elevated text-fg shadow-[inset_0_0_0_1px_var(--line-strong)]" : "text-muted hover:text-fg",
              unavailable && "cursor-not-allowed text-subtle hover:text-subtle",
            )}
          >
            {o.locked && <Lock className="size-3" aria-label="Locked" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
