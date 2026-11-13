"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Decorative product preview — illustrative only, not live stats. */
export function HeroPreview() {
  const reduce = useReducedMotion();
  const beats = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-line/80 bg-surface/80 shadow-[0_40px_100px_-48px_rgba(0,0,0,0.85)] glow-ring"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--accent)_26%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_80%,color-mix(in_srgb,var(--cyan)_14%,transparent),transparent_45%)]" />
      <div className="relative grid gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange">Maintain Tempo</div>
            <div className="mt-1 font-display text-[20px] font-semibold tracking-tight">100 BPM · Independent</div>
          </div>
          <div className="rounded-full border border-line bg-elevated/80 px-3 py-1 text-[12px] text-muted">
            Illustrative
          </div>
        </div>

        <div className="grid grid-cols-8 gap-1.5 rounded-[16px] border border-line/80 bg-bg/60 p-3">
          {beats.map((b) => (
            <motion.div
              key={b}
              className="aspect-square rounded-[8px] bg-elevated"
              animate={
                reduce
                  ? undefined
                  : {
                      backgroundColor: [
                        "var(--elevated)",
                        "color-mix(in srgb, var(--orange) 55%, var(--elevated))",
                        "var(--elevated)",
                      ],
                    }
              }
              transition={{ duration: 1.6, repeat: Infinity, delay: b * 0.12, ease: "easeInOut" }}
            />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label="Timing" value="−12 ms" hint="Slightly early" />
          <MiniStat label="Accuracy" value="94%" hint="Great window" />
          <MiniStat label="Streak" value="7 days" hint="Daily puzzle" />
        </div>

        <div className="flex items-end gap-1.5 rounded-[16px] border border-line/80 bg-bg/50 px-3 py-3">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = 20 + ((i * 37) % 48);
            return (
              <motion.div
                key={i}
                className="flex-1 rounded-sm bg-cyan/70"
                style={{ height: h }}
                animate={reduce ? undefined : { opacity: [0.35, 1, 0.45] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.04 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[14px] border border-line/80 bg-bg/55 px-3 py-2.5">
      <div className="text-[11px] text-subtle">{label}</div>
      <div className="mt-0.5 tabular font-display text-[17px] font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{hint}</div>
    </div>
  );
}
