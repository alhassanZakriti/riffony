"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Share2, Volume2 } from "lucide-react";
import { GuitarFretboard } from "@/features/fretboard/components/guitar-fretboard";
import { TUNINGS } from "@/features/fretboard/engine/tuning";
import { Button, ButtonLink } from "@/components/ui/button";
import { resumeAudio } from "@/lib/audio/context";
import { LookaheadScheduler } from "@/lib/audio/scheduler";
import { playClick, playFeedback, playTone } from "@/lib/audio/sounds";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { BILLING } from "@/lib/product/billing";
import { cn } from "@/lib/utils";
import {
  formatCountdown,
  formatPuzzleDate,
  msUntilNextPuzzle,
  puzzleDayKey,
  recentPuzzleDates,
} from "./date";
import { puzzleStreak } from "./streak";
import {
  DIFFICULTY_LABEL,
  PUZZLE_KIND_LABEL,
  type PuzzleAnswer,
  type PuzzleResult,
  type PublicPuzzle,
} from "./types";

type Phase = "loading" | "intro" | "playing" | "result" | "error";

export function PuzzlePlayer({ initialDate }: { initialDate?: string }) {
  const hydrated = useHydrated();
  const attempts = useAppStore((s) => s.dailyPuzzleAttempts);
  const recordDailyPuzzle = useAppStore((s) => s.recordDailyPuzzle);
  const hasProfile = useAppStore((s) => Boolean(s.localProfileCreatedAt || s.settings.displayName));
  const volume = useAppStore((s) => s.settings.masterVolume);

  const [today, setToday] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [puzzle, setPuzzle] = useState<PublicPuzzle | null>(null);
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const [memoryRevealed, setMemoryRevealed] = useState(true);
  const [countdown, setCountdown] = useState("--:--:--");
  const [archive, setArchive] = useState<
    { date: string; kind: PublicPuzzle["kind"]; difficulty: PublicPuzzle["difficulty"]; title: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const scheduler = useRef(new LookaheadScheduler());
  const startedAt = useRef(0);

  const stored = hydrated && date ? attempts[date] : undefined;
  const streak = hydrated ? puzzleStreak(attempts) : 0;

  const load = useCallback(async (d: string) => {
    setPhase("loading");
    setError(null);
    setResult(null);
    setPuzzle(null);
    try {
      const res = await fetch(`/api/daily-puzzle?date=${d}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load puzzle");
      setPuzzle(data.puzzle as PublicPuzzle);
      const existing = useAppStore.getState().dailyPuzzleAttempts[d];
      if (existing) {
        setResult({
          date: existing.date,
          kind: existing.kind,
          correct: existing.correct,
          score: existing.score,
          rating: existing.rating,
          explanation: existing.explanation,
          correctLabel: existing.correctLabel,
          submittedLabel: existing.submittedLabel,
        });
        setPhase("result");
      } else {
        setPhase("intro");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    const t = puzzleDayKey();
    setToday(t);
    setDate((prev) => {
      if (initialDate && initialDate <= t) return initialDate;
      return prev && prev <= t ? prev : t;
    });
    setCountdown(formatCountdown(msUntilNextPuzzle()));
    const id = window.setInterval(() => setCountdown(formatCountdown(msUntilNextPuzzle())), 1000);
    void fetch("/api/daily-puzzle?meta=archive")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.archive)) setArchive(data.archive);
      })
      .catch(() => {});
    return () => {
      clearInterval(id);
      scheduler.current.stop();
    };
  }, [initialDate]);

  useEffect(() => {
    if (!date) return;
    void load(date);
  }, [date, load]);

  const begin = () => {
    startedAt.current = performance.now();
    setPhase("playing");
    if (puzzle?.content.kind === "musical-memory") {
      setMemoryRevealed(true);
      window.setTimeout(() => setMemoryRevealed(false), 2800);
    }
  };

  const playStimulus = async () => {
    if (!puzzle) return;
    const ctx = await resumeAudio();
    const c = puzzle.content;
    if (c.kind === "note-recognition" || c.kind === "ear-training") {
      if (c.kind === "note-recognition") {
        playTone(c.midi, ctx.currentTime + 0.05, 0.7, volume * 0.55);
      } else {
        playTone(c.midiA, ctx.currentTime + 0.05, 0.45, volume * 0.55);
        playTone(c.midiB, ctx.currentTime + 0.7, 0.45, volume * 0.55);
      }
      return;
    }
    if (c.kind === "tempo-challenge") {
      const interval = 60 / c.playBpm;
      const events = Array.from({ length: c.clickCount }, (_, i) => ({
        time: ctx.currentTime + 0.08 + i * interval,
        play: (t: number) => playClick(t, { accent: i === 0, volume: volume * 0.7, sound: "click" }),
      }));
      scheduler.current.stop();
      scheduler.current.start(events);
      return;
    }
    if (c.kind === "rhythm-recognition") {
      let t = ctx.currentTime + 0.08;
      const quarter = 0.45;
      const timed: { time: number; play: (when: number) => ReturnType<typeof playClick> | undefined }[] = [];
      for (const b of c.playBeats) {
        if (b > 0) {
          const at = t;
          timed.push({
            time: at,
            play: (when) => playClick(when, { accent: false, volume: volume * 0.65, sound: "woodblock" }),
          });
        }
        t += (b > 0 ? b : 1) * quarter;
      }
      scheduler.current.stop();
      scheduler.current.start(timed);
    }
  };

  const submit = async (answer: PuzzleAnswer) => {
    if (!puzzle || !date || stored) return;
    try {
      const res = await fetch("/api/daily-puzzle/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      const graded = data.result as PuzzleResult;
      setResult(graded);
      recordDailyPuzzle({
        date: graded.date,
        kind: graded.kind,
        score: graded.score,
        correct: graded.correct,
        rating: graded.rating,
        explanation: graded.explanation,
        correctLabel: graded.correctLabel,
        submittedLabel: graded.submittedLabel,
      });
      playFeedback(graded.score >= 80 ? "success" : "error", volume * 0.5);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    }
  };

  const share = async () => {
    if (!result) return;
    const text = `RIFFONY Daily Puzzle · ${result.date}\n${PUZZLE_KIND_LABEL[result.kind]} · ${result.score}/100 (${result.rating})\nPlay today’s challenge on RIFFONY`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "RIFFONY Daily Puzzle", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* user cancelled */
    }
  };

  const relatedHref = useMemo(() => {
    if (!puzzle) return "/app";
    switch (puzzle.kind) {
      case "tempo-challenge":
      case "rhythm-recognition":
        return "/tempo";
      case "fretboard-challenge":
        return "/fretboard";
      case "note-recognition":
      case "ear-training":
      case "musical-memory":
        return "/notes";
    }
  }, [puzzle]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent">Daily Puzzle</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight sm:text-[40px]">
            {!date || !today ? "Daily Challenge" : date === today ? "Today’s Challenge" : formatPuzzleDate(date)}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Resets 00:00 UTC · Next in {countdown}
            {streak > 0 ? ` · ${streak}-day streak` : ""}
          </p>
        </div>
        {date && today && date !== today && (
          <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
            Back to today
          </Button>
        )}
      </div>

      {(phase === "loading" || !date) && phase !== "error" && (
        <div className="mt-8 h-64 animate-pulse rounded-[18px] border border-line bg-elevated/40" />
      )}
      {phase === "error" && (
        <div className="mt-8 rounded-[18px] border border-error/30 bg-error/10 p-6 text-[14px] text-error">
          {error ?? "Something went wrong."}
          <div className="mt-3">
            <Button
              onClick={() => {
                if (date) void load(date);
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {puzzle && (phase === "intro" || phase === "playing") && (
        <div className="mt-8 rounded-[20px] border border-line bg-surface/80 p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-full border border-line px-2.5 py-1 text-muted">{PUZZLE_KIND_LABEL[puzzle.kind]}</span>
            <span className="rounded-full border border-line px-2.5 py-1 text-muted">{DIFFICULTY_LABEL[puzzle.difficulty]}</span>
            <span className="rounded-full border border-line px-2.5 py-1 text-muted">~{puzzle.estimatedSeconds}s</span>
          </div>
          <h2 className="mt-4 font-display text-[24px] font-semibold">{puzzle.title}</h2>
          <p className="mt-2 text-[14px] text-muted">{puzzle.description}</p>

          {phase === "intro" && (
            <div className="mt-6 space-y-4">
              <p className="text-[14px] text-fg">{puzzle.prompt}</p>
              <p className="text-[13px] text-subtle">
                Submit once — refreshing won’t grant a new puzzle or extra XP for this UTC day.
              </p>
              <Button variant="primary" size="lg" onClick={begin}>
                Start
              </Button>
            </div>
          )}

          {phase === "playing" && (
            <div className="mt-6 space-y-6">
              <p className="text-[15px] font-medium">{puzzle.prompt}</p>
              <PuzzleBody
                puzzle={puzzle}
                memoryRevealed={memoryRevealed}
                onPlay={() => void playStimulus()}
                onAnswer={(a) => void submit(a)}
              />
            </div>
          )}
        </div>
      )}

      {phase === "result" && result && (
        <div className="mt-8 space-y-5">
          <div className="rounded-[20px] border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-2 text-success">
              <Check className="size-5" />
              <span className="text-[13px] font-medium uppercase tracking-[0.12em]">Challenge completed</span>
            </div>
            <h2 className="mt-3 font-display text-[28px] font-semibold tracking-tight">
              {result.correct ? "Nice work." : "Good attempt."}
            </h2>
            <p className="mt-2 text-[15px] text-muted">{result.explanation}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Score" value={`${result.score}/100`} />
              <Stat label="Rating" value={result.rating} />
              <Stat label="Your answer" value={result.submittedLabel} />
              <Stat label="Correct" value={result.correctLabel} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void share()}>
                <Share2 className="size-4" />
                Share Result
              </Button>
              <ButtonLink href={relatedHref} variant="primary">
                Related training
              </ButtonLink>
              {!hasProfile && (
                <ButtonLink href={BILLING.earlyAccess.href} variant="ghost">
                  Save progress free
                </ButtonLink>
              )}
            </div>
            {!hasProfile && (
              <p className="mt-4 text-[13px] text-subtle">
                Create a free local profile to keep streaks and results on this device.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Archive */}
      {today && (
        <section className="mt-14">
          <h2 className="font-display text-[20px] font-semibold">Previous puzzles</h2>
          <p className="mt-1 text-[13px] text-muted">Replay earlier days for practice. Only today’s first clear awards XP.</p>
          <ul className="mt-4 divide-y divide-line rounded-[16px] border border-line">
            <ArchiveRow
              date={today}
              title={puzzle?.title ?? "Today"}
              kind={puzzle?.kind}
              difficulty={puzzle?.difficulty}
              done={Boolean(attempts[today])}
              active={date === today}
              onSelect={() => setDate(today)}
            />
            {(archive.length
              ? archive
              : recentPuzzleDates(7, today).map((d) => ({
                  date: d,
                  title: d,
                  kind: undefined as PublicPuzzle["kind"] | undefined,
                  difficulty: undefined as PublicPuzzle["difficulty"] | undefined,
                }))
            ).map((row) => (
              <ArchiveRow
                key={row.date}
                date={row.date}
                title={row.title}
                kind={row.kind}
                difficulty={row.difficulty}
                done={Boolean(attempts[row.date])}
                active={date === row.date}
                onSelect={() => setDate(row.date)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ArchiveRow({
  date,
  title,
  kind,
  difficulty,
  done,
  active,
  onSelect,
}: {
  date: string;
  title: string;
  kind?: PublicPuzzle["kind"];
  difficulty?: PublicPuzzle["difficulty"];
  done: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13px] transition-colors hover:bg-elevated/50",
          active && "bg-accent/10",
        )}
      >
        <div className="min-w-0">
          <div className="truncate font-medium text-fg">{title}</div>
          <div className="text-subtle">
            {formatPuzzleDate(date)}
            {kind ? ` · ${PUZZLE_KIND_LABEL[kind]}` : ""}
            {difficulty ? ` · ${DIFFICULTY_LABEL[difficulty]}` : ""}
          </div>
        </div>
        <span className={done ? "text-success" : "text-subtle"}>{done ? "Done" : "Open"}</span>
      </button>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-bg/60 px-3 py-2.5">
      <div className="text-[11px] text-subtle">{label}</div>
      <div className="mt-0.5 truncate text-[14px] font-medium">{value}</div>
    </div>
  );
}

function PuzzleBody({
  puzzle,
  memoryRevealed,
  onPlay,
  onAnswer,
}: {
  puzzle: PublicPuzzle;
  memoryRevealed: boolean;
  onPlay: () => void;
  onAnswer: (a: PuzzleAnswer) => void;
}) {
  const c = puzzle.content;

  if (c.kind === "note-recognition") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {c.revealMode === "staff" ? (
            <div className="rounded-[14px] border border-line bg-bg px-6 py-8 text-center">
              <div className="text-[11px] uppercase tracking-[0.14em] text-subtle">Pitch</div>
              <div className="mt-2 font-display text-[48px] font-semibold text-accent">♪</div>
              <div className="mt-1 text-[12px] text-muted">Listen, then choose the pitch class</div>
            </div>
          ) : (
            <div className="rounded-[14px] border border-line bg-bg px-6 py-6 text-[13px] text-muted">
              Audio-only trial — no written pitch.
            </div>
          )}
          <Button variant="secondary" onClick={onPlay}>
            <Volume2 className="size-4" /> Play note
          </Button>
        </div>
        <ChoiceGrid
          choices={c.choices}
          onPick={(choice) => onAnswer({ kind: "note-recognition", choice })}
        />
      </div>
    );
  }

  if (c.kind === "rhythm-recognition") {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={onPlay}>
          <Volume2 className="size-4" /> Play rhythm
        </Button>
        <ChoiceGrid
          choices={c.choices.map((x) => x.label)}
          onPick={(label) => {
            const hit = c.choices.find((x) => x.label === label);
            if (hit) onAnswer({ kind: "rhythm-recognition", choiceId: hit.id });
          }}
        />
      </div>
    );
  }

  if (c.kind === "tempo-challenge") {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={onPlay}>
          <Volume2 className="size-4" /> Play metronome
        </Button>
        <p className="text-[12px] text-subtle">Playback stops automatically — estimate from memory.</p>
        <ChoiceGrid
          choices={c.bpmChoices.map((n) => `${n} BPM`)}
          onPick={(label) => onAnswer({ kind: "tempo-challenge", bpm: Number(label.replace(" BPM", "")) })}
        />
      </div>
    );
  }

  if (c.kind === "fretboard-challenge") {
    return (
      <div className="space-y-4">
        <GuitarFretboard
          openMidi={TUNINGS.standard.openMidi}
          fretCount={12}
          preference="sharps"
          showNoteNames={false}
          revealAnswerLabels={false}
          interactive={false}
          highlights={{ [`${c.string}-${c.fret}`]: "prompt" }}
        />
        <ChoiceGrid
          choices={c.choices}
          onPick={(choice) => onAnswer({ kind: "fretboard-challenge", choice })}
        />
      </div>
    );
  }

  if (c.kind === "musical-memory") {
    return (
      <div className="space-y-4">
        <div className="rounded-[14px] border border-line bg-bg px-4 py-6 text-center">
          {memoryRevealed ? (
            <div className="font-display text-[28px] font-semibold tracking-wide">
              {c.sequenceLabels.join(" · ")}
            </div>
          ) : (
            <div className="text-[14px] text-muted">Sequence hidden — pick the matching option.</div>
          )}
        </div>
        <div className="grid gap-2">
          {c.choices.map((seq, i) => (
            <Button
              key={seq.join("-")}
              variant="secondary"
              className="justify-center"
              disabled={memoryRevealed}
              onClick={() => onAnswer({ kind: "musical-memory", choiceIndex: i })}
            >
              {seq.join(" · ")}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // ear-training
  return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={onPlay}>
        <Volume2 className="size-4" /> Play both notes
      </Button>
      <ChoiceGrid
        choices={[...c.choices]}
        onPick={(choice) => onAnswer({ kind: "ear-training", choice: choice as "Same" | "Different" })}
      />
    </div>
  );
}

function ChoiceGrid({ choices, onPick }: { choices: string[]; onPick: (c: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {choices.map((c) => (
        <Button key={c} variant="secondary" size="lg" className="justify-center" onClick={() => onPick(c)}>
          {c}
        </Button>
      ))}
    </div>
  );
}
