"use client";

import Link from "next/link";
import { ArrowRight, Flame, Guitar, Hand, Mic2, Music2, Timer } from "lucide-react";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ScoreChart } from "@/components/dashboard/score-chart";
import { ButtonLink } from "@/components/ui/button";
import { Badge, ProgressBar, ProgressRing, Skeleton } from "@/components/ui/controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  CATEGORY_LABEL,
  EXERCISE_HREF,
  EXERCISE_LABEL,
  computeStreak,
  dailySeries,
  overview,
  recommendNext,
  todayMinutes,
} from "@/features/gamification/stats";
import { levelFromXp } from "@/features/gamification/xp";
import { useHydrated } from "@/hooks/use-hydrated";
import { totalXp, useAppStore } from "@/lib/store";
import { cn, formatDuration, formatMs, formatPercent, round } from "@/lib/utils";

const MODULES = [
  {
    href: "/tempo",
    title: "Tempo Training",
    blurb: "Internal clock, silent phases, and millisecond timing feedback.",
    icon: Timer,
    accent: "orange" as const,
    visual: "rhythm",
  },
  {
    href: "/fingers",
    title: "Finger Training",
    blurb: "PIMA independence drills with reaction-speed scoring.",
    icon: Hand,
    accent: "violet" as const,
    visual: "keys",
  },
  {
    href: "/notes",
    title: "Note Recognition",
    blurb: "Pitch matching through mic or MIDI with string progression.",
    icon: Music2,
    accent: "cyan" as const,
    visual: "wave",
  },
  {
    href: "/voice",
    title: "Voice Training",
    blurb: "Match, intervals, scales, and vocal stability in real time.",
    icon: Mic2,
    accent: "blue" as const,
    visual: "voice",
  },
  {
    href: "/fretboard",
    title: "Fretboard Learning",
    blurb: "Active-recall note mastery across the neck.",
    icon: Guitar,
    accent: "violet" as const,
    visual: "fret",
  },
] as const;

const ACCENT_BORDER = {
  orange: "hover:border-orange/40",
  violet: "hover:border-accent/40",
  cyan: "hover:border-cyan/40",
  blue: "hover:border-blue/40",
};

const ACCENT_ICON = {
  orange: "text-orange border-orange/25 bg-orange/10",
  violet: "text-accent border-accent/25 bg-accent/10",
  cyan: "text-cyan border-cyan/25 bg-cyan/10",
  blue: "text-blue border-blue/25 bg-blue/10",
};

const ACCENT_GLOW = {
  orange: "bg-[radial-gradient(circle,color-mix(in_srgb,var(--orange)_28%,transparent),transparent_70%)]",
  violet: "bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_70%)]",
  cyan: "bg-[radial-gradient(circle,color-mix(in_srgb,var(--cyan)_28%,transparent),transparent_70%)]",
  blue: "bg-[radial-gradient(circle,color-mix(in_srgb,var(--blue)_28%,transparent),transparent_70%)]",
};

export function DashboardView() {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.sessions);
  const settings = useAppStore((s) => s.settings);
  const dailyPuzzleAttempts = useAppStore((s) => s.dailyPuzzleAttempts);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const xp = totalXp(sessions, dailyPuzzleAttempts);
  const { level, progress, intoLevel, levelSpan } = levelFromXp(xp);
  const streak = computeStreak(sessions);
  const stats = overview(sessions);
  const minutesToday = todayMinutes(sessions);
  const goal = settings.dailyGoalMinutes;
  const goalProgress = Math.min(1, minutesToday / Math.max(1, goal));
  const series = dailySeries(sessions, 30);
  const rec = recommendNext(sessions);
  const recent = [...sessions].reverse().slice(0, 6);
  const name = settings.displayName.trim();
  const greeting = name ? `Welcome back, ${name}` : "Welcome back";
  const category =
    CATEGORY_LABEL[
      rec.exercise === "fingers"
        ? "fingers"
        : rec.exercise === "notes"
          ? "notes"
          : rec.exercise === "fretboard"
            ? "fretboard"
            : rec.exercise.startsWith("voice")
              ? "voice"
              : "tempo"
    ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Cinematic hero */}
      <section className="relative mb-8 overflow-hidden rounded-[24px] border border-line/80 bg-surface/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_50%),radial-gradient(ellipse_at_90%_20%,color-mix(in_srgb,var(--cyan)_14%,transparent),transparent_45%)]" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Dashboard</p>
            <h1 className="mt-3 font-display text-[34px] font-semibold tracking-tight sm:text-[42px]">{greeting}</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              Ready to sharpen your musical reflexes? Pick up where the data says you should train next.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <ProgressRing value={progress} size={72} label="Level progress">
                <span className="tabular text-[14px] font-semibold">{level}</span>
              </ProgressRing>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-[18px] font-semibold">Level {level}</span>
                  <span className="tabular text-[13px] text-muted">{xp} XP</span>
                </div>
                <ProgressBar value={progress} label="XP into level" className="mt-2 w-48 sm:w-56" />
                <p className="mt-1.5 text-[12px] text-subtle">
                  {intoLevel} / {levelSpan} XP to next level
                </p>
              </div>
              <div className="flex items-center gap-2.5 rounded-[14px] border border-orange/25 bg-orange/10 px-3.5 py-2.5">
                <Flame className={streak > 0 ? "size-4 text-orange" : "size-4 text-subtle"} />
                <div>
                  <div className="tabular text-[16px] font-semibold">{streak}</div>
                  <div className="text-[11px] text-muted">day streak</div>
                </div>
              </div>
            </div>
          </div>

          <Card variant="featured" className="border-0">
            <CardBody className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Recommended</p>
                <p className="mt-1 text-[12px] text-muted">{category}</p>
                <h2 className="mt-2 font-display text-[22px] font-semibold tracking-tight">
                  {EXERCISE_LABEL[rec.exercise]}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{rec.reason}</p>
              </div>
              <ButtonLink href={EXERCISE_HREF[rec.exercise]} variant="primary" size="lg" className="w-full">
                Start Training
                <ArrowRight className="size-4" />
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </section>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Training time" value={formatDuration(stats.totalMs)} hint={`${stats.sessions} sessions`} tone="violet" />
        <StatTile label="Overall accuracy" value={formatPercent(stats.accuracy)} hint="Excludes tempo guessing" tone="cyan" />
        <StatTile label="Avg reaction" value={formatMs(stats.avgReactionMs)} hint="Fingers & notes" tone="orange" />
        <StatTile
          label="Daily objective"
          value={`${round(minutesToday, 1)} / ${goal} min`}
          tone="lime"
          hint={
            <ProgressBar
              value={goalProgress}
              label="Daily goal"
              className="mt-2"
              tone={goalProgress >= 1 ? "success" : "accent"}
            />
          }
        />
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[22px] font-semibold tracking-tight">Training modules</h2>
            <p className="mt-1 text-[13px] text-muted">Each discipline keeps its own visual identity.</p>
          </div>
          <ButtonLink href="/daily-puzzle" variant="ghost" size="sm">
            Daily Puzzle
            <ArrowRight className="size-3.5" />
          </ButtonLink>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className={cn(
                  "group relative overflow-hidden rounded-[20px] border border-line/80 bg-surface/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-elevated/50",
                  ACCENT_BORDER[m.accent],
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-6 -top-8 size-32 rounded-full opacity-90 blur-2xl",
                    ACCENT_GLOW[m.accent],
                  )}
                />
                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-[12px] border",
                        ACCENT_ICON[m.accent],
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <ModuleVisual kind={m.visual} />
                  </div>
                  <h3 className="font-display text-[18px] font-semibold tracking-tight">{m.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{m.blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-fg/80 group-hover:text-fg">
                    Open module <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card variant="glass">
          <CardHeader title="30-day performance" description="Average score per category on days you trained." />
          <CardBody>
            <ScoreChart data={series} />
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardHeader
            title="Recent sessions"
            description="Latest scores across every module."
            action={
              <ButtonLink href="/progress" variant="ghost" size="sm">
                View all
              </ButtonLink>
            }
          />
          <CardBody className="pt-0">
            {recent.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">
                No sessions yet. Start with Finger Training — no mic required.
              </p>
            ) : (
              <ul className="divide-y divide-line/80">
                {recent.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-fg">{EXERCISE_LABEL[s.exercise]}</div>
                      <div className="truncate text-muted">
                        {new Date(s.startedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {s.configLabel}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.perfect && <Badge tone="success">Perfect</Badge>}
                      <span className="tabular font-display text-[16px] font-semibold">{s.score}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ModuleVisual({ kind }: { kind: "rhythm" | "keys" | "wave" | "voice" | "fret" }) {
  if (kind === "rhythm") {
    return (
      <div className="flex items-end gap-1 opacity-70" aria-hidden>
        {[40, 70, 45, 85, 55, 75].map((h, i) => (
          <span key={i} className="w-1.5 rounded-full bg-orange/70" style={{ height: h / 4 }} />
        ))}
      </div>
    );
  }
  if (kind === "keys") {
    return (
      <div className="flex gap-0.5 opacity-70" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className={cn("h-6 w-2 rounded-[2px]", i % 2 ? "bg-accent/50 h-4 self-end" : "bg-fg/25")}
          />
        ))}
      </div>
    );
  }
  if (kind === "wave" || kind === "voice") {
    return (
      <svg width="56" height="24" viewBox="0 0 56 24" className="opacity-70" aria-hidden>
        <path
          d="M0 12 C6 4, 10 20, 16 12 S26 4, 32 12 42 20, 48 12 54 6, 56 12"
          fill="none"
          stroke={kind === "voice" ? "var(--blue)" : "var(--cyan)"}
          strokeWidth="2"
        />
      </svg>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-0.5 opacity-70" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="h-2 w-3 rounded-[2px] bg-accent/40" />
      ))}
    </div>
  );
}
