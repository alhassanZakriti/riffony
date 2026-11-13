"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock, Flame } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { formatCountdown, formatPuzzleDate, msUntilNextPuzzle, puzzleDayKey } from "./date";
import { puzzleStreak } from "./streak";
import { DIFFICULTY_LABEL, PUZZLE_KIND_LABEL, type PublicPuzzle } from "./types";

export function DailyPuzzleTeaser() {
  const hydrated = useHydrated();
  const attempts = useAppStore((s) => s.dailyPuzzleAttempts);
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("--:--:--");
  const done = hydrated && today ? attempts[today] : undefined;
  const streak = hydrated ? puzzleStreak(attempts) : 0;

  useEffect(() => {
    setToday(puzzleDayKey());
    setCountdown(formatCountdown(msUntilNextPuzzle()));
    const id = window.setInterval(() => setCountdown(formatCountdown(msUntilNextPuzzle())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    void fetch(`/api/daily-puzzle?date=${today}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.puzzle) setPuzzle(data.puzzle as PublicPuzzle);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [today]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-coral/25 bg-surface/70 glow-ring">
      <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_srgb,var(--coral)_18%,transparent),transparent_55%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-coral/40 bg-coral/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-coral">
                Daily Puzzle
              </span>
              <span className="text-[12px] text-subtle">{today ? `${formatPuzzleDate(today)} · UTC` : "UTC"}</span>
            </div>
            <h3 className="mt-4 font-display text-[28px] font-semibold tracking-tight sm:text-[34px]">
              {puzzle?.title ?? "Loading today’s challenge…"}
            </h3>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
              {puzzle?.description ?? "A short musical skill challenge shared by everyone today."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
              {puzzle && (
                <>
                  <Chip>{PUZZLE_KIND_LABEL[puzzle.kind]}</Chip>
                  <Chip>{DIFFICULTY_LABEL[puzzle.difficulty]}</Chip>
                  <Chip>~{puzzle.estimatedSeconds}s</Chip>
                </>
              )}
              {done && <Chip tone="success">Completed · {Math.round(done.score)}</Chip>}
              {streak > 0 && (
                <Chip>
                  <Flame className="size-3.5 text-orange" /> {streak}-day streak
                </Chip>
              )}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href="/daily-puzzle" variant="primary" size="lg">
                {done ? "View Today’s Result" : "Play Today’s Puzzle"}
                <ArrowRight className="size-4" />
              </ButtonLink>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-subtle">
                <Clock className="size-3.5" /> Next puzzle in {countdown}
              </span>
            </div>
          </div>
        </div>
        <div className="relative border-t border-line/80 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_60%)]" />
          <div className="relative">
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-subtle">Why it matters</div>
            <ul className="mt-4 space-y-3 text-[14px] text-muted">
              <li>Same puzzle for every visitor — compare fairly.</li>
              <li>Play as a guest; save streaks with a free local profile.</li>
              <li>Answers stay hidden until you submit.</li>
              <li>One official attempt per UTC day for XP.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "success" }) {
  return (
    <span
      className={
        tone === "success"
          ? "inline-flex items-center gap-1 rounded-full border border-lime/30 bg-lime/10 px-2.5 py-1 text-lime"
          : "inline-flex items-center gap-1 rounded-full border border-line bg-elevated/60 px-2.5 py-1 text-muted"
      }
    >
      {children}
    </span>
  );
}
