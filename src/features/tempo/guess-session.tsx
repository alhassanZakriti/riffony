"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Play, RotateCcw, Send } from "lucide-react";
import { SessionResults } from "@/components/training/session-results";
import { Button } from "@/components/ui/button";
import { Badge, Slider } from "@/components/ui/controls";
import { TierSelector } from "@/components/training/tier-selector";
import { Card, CardBody } from "@/components/ui/card";
import { resumeAudio } from "@/lib/audio/context";
import { LookaheadScheduler } from "@/lib/audio/scheduler";
import { playDrum, playFeedback } from "@/lib/audio/sounds";
import { SESSION_LENGTHS } from "@/lib/store/defaults";
import { useAppStore, type RecordOutcome } from "@/lib/store";
import { guessErrorPct, scoreGuess, type GuessRound } from "@/lib/scoring/guess";
import { SCORING } from "@/lib/scoring/weights";
import { useFocusMode } from "@/hooks/training/use-focus-mode";
import { bestScoreForTier, highestUnlockedTier, TIER_NAMES, tierProgress } from "@/features/gamification/tiers";
import { pick, round } from "@/lib/utils";
import type { Tier } from "@/types";
import { GUESS_PATTERN_LABEL, TEMPO_TIERS, type GuessPatternId } from "./config";
import { expandPattern } from "./patterns";

type Phase = "setup" | "listening" | "answer" | "feedback" | "results";

export function GuessTempoSession({ header }: { header?: ReactNode }) {
  const settings = useAppStore((s) => s.settings);
  const sessions = useAppStore((s) => s.sessions);
  const recordSession = useAppStore((s) => s.recordSession);
  const setLastTier = useAppStore((s) => s.setLastTier);
  const unlocked = highestUnlockedTier(sessions, "tempo");
  const lastTier = useAppStore((s) => s.lastTier["tempo-guess"] ?? 0);
  const progressInfo = tierProgress(sessions, "tempo");
  const bestByTier = bestScoreForTier(sessions, "tempo-guess");

  const [tier, setTier] = useState<Tier>(Math.min(lastTier, unlocked) as Tier);
  const [phase, setPhase] = useState<Phase>("setup");
  const [guess, setGuess] = useState(100);
  const [feedback, setFeedback] = useState<{ actual: number; error: number; credit: number } | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);

  const scheduler = useRef(new LookaheadScheduler());
  const roundsRef = useRef<GuessRound[]>([]);
  const currentRef = useRef<{ bpm: number; pattern: GuessPatternId; replays: number } | null>(null);
  const startedAtIso = useRef("");
  const startPerf = useRef(0);
  const totalRounds = SESSION_LENGTHS[settings.sessionLength].guessRounds;

  useFocusMode(phase === "listening" || phase === "answer" || phase === "feedback");

  const bpmPool = useMemo(() => {
    const base = TEMPO_TIERS[tier].bpms;
    // Intermediate+ can land between the preset marks.
    if (tier >= 2) {
      const extra: number[] = [];
      for (let b = base[0]; b <= base[base.length - 1]; b += 5) extra.push(b);
      return extra;
    }
    return [...base];
  }, [tier]);

  const playRound = async (replay = false) => {
    await resumeAudio();
    const cfg = TEMPO_TIERS[tier];
    if (!replay || !currentRef.current) {
      currentRef.current = {
        bpm: pick(bpmPool),
        pattern: pick(cfg.patterns),
        replays: 0,
      };
    } else {
      currentRef.current.replays += 1;
    }
    const { bpm, pattern } = currentRef.current;
    const ctx = await resumeAudio();
    const bars = tier >= 2 ? 2 : 3;
    const events = expandPattern(pattern, bars, bpm, ctx.currentTime + 0.12).map((e) => ({
      time: e.time,
      play: (t: number) => playDrum(e.voice, t, settings.masterVolume * 0.7),
    }));
    scheduler.current.stop();
    scheduler.current.start(events);
    setPhase("listening");
    const durationMs = bars * 4 * (60_000 / bpm) + 200;
    window.setTimeout(() => {
      scheduler.current.stop();
      setPhase((p) => (p === "listening" ? "answer" : p));
    }, durationMs);
  };

  const begin = () => {
    roundsRef.current = [];
    setRoundIndex(0);
    setOutcome(null);
    setFeedback(null);
    startedAtIso.current = new Date().toISOString();
    startPerf.current = performance.now();
    setLastTier("tempo-guess", tier);
    void playRound(false);
  };

  const submit = () => {
    const cur = currentRef.current;
    if (!cur) return;
    const round: GuessRound = {
      actualBpm: cur.bpm,
      guessBpm: guess,
      pattern: cur.pattern,
      replays: cur.replays,
    };
    roundsRef.current.push(round);
    const error = guessErrorPct(round);
    const credit = Math.max(0, 1 - error / SCORING.guess.zeroAtPct);
    setFeedback({ actual: cur.bpm, error, credit });
    if (settings.feedbackSounds) {
      playFeedback(error <= SCORING.guess.precisePct ? "success" : error <= SCORING.guess.accuratePct ? "tick" : "error", settings.masterVolume * 0.55);
    }
    setPhase("feedback");
  };

  const next = () => {
    if (roundsRef.current.length >= totalRounds) {
      const scored = scoreGuess(roundsRef.current);
      const preciseRounds = roundsRef.current.filter((r) => guessErrorPct(r) <= SCORING.guess.precisePct).length;
      const result = recordSession({
        exercise: "tempo-guess",
        category: "tempo",
        tier,
        startedAt: startedAtIso.current,
        durationMs: performance.now() - startPerf.current,
        score: scored.score,
        accuracy: scored.components.find((c) => c.id === "estimation")?.value ?? 0,
        avgReactionMs: null,
        bestReactionMs: null,
        correct: roundsRef.current.filter((r) => guessErrorPct(r) <= SCORING.guess.accuratePct).length,
        errors: roundsRef.current.filter((r) => guessErrorPct(r) > SCORING.guess.accuratePct).length,
        breakdown: scored.components,
        stats: {
          rounds: roundsRef.current.length,
          preciseRounds,
          meanErrorPct: roundsRef.current.reduce((s, r) => s + guessErrorPct(r), 0) / roundsRef.current.length,
        },
        configLabel: `${TIER_NAMES[tier]} · ${totalRounds} rounds`,
        perfect: preciseRounds === roundsRef.current.length && roundsRef.current.length > 0,
      });
      setOutcome(result);
      setPhase("results");
      return;
    }
    setRoundIndex(roundsRef.current.length);
    setFeedback(null);
    void playRound(false);
  };

  if (phase === "results" && outcome) {
    return <SessionResults outcome={outcome} onRetry={() => setPhase("setup")} dashboardHref="/tempo" />;
  }

  return (
    <div
      className={
        phase !== "setup"
          ? "mx-auto flex min-h-[80dvh] max-w-lg flex-col justify-center gap-6 px-4 py-8"
          : "mx-auto max-w-3xl"
      }
    >
      {phase === "setup" && header}
      {phase === "setup" && (
        <Card>
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-medium">Guess the Tempo</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Listen to a short synthesised groove, then estimate its BPM. No commercial recordings are used.
                </p>
              </div>
              <Badge tone="accent">{TIER_NAMES[tier]}</Badge>
            </div>
            <TierSelector
              value={tier}
              unlocked={unlocked}
              onChange={setTier}
              bestByTier={bestByTier}
              progress={progressInfo}
            />
            <Button variant="primary" size="lg" onClick={begin}>
              <Play className="size-4" />
              Start · {totalRounds} rounds
            </Button>
          </CardBody>
        </Card>
      )}

      {(phase === "listening" || phase === "answer" || phase === "feedback") && (
        <>
          <div className="text-center">
            <p className="text-[12px] uppercase tracking-[0.1em] text-muted">
              Round {Math.min(roundIndex + 1, totalRounds)} / {totalRounds}
            </p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight">
              {phase === "listening" ? "Listen…" : phase === "answer" ? "What’s the BPM?" : "Result"}
            </h2>
            {currentRef.current && phase !== "listening" && (
              <p className="mt-1 text-[13px] text-muted">{GUESS_PATTERN_LABEL[currentRef.current.pattern]}</p>
            )}
          </div>

          {phase === "listening" && (
            <div className="flex justify-center">
              <div className="flex size-28 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
                <span className="size-3 animate-pulse rounded-full bg-accent" />
              </div>
            </div>
          )}

          {phase === "answer" && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="tabular text-[56px] font-semibold tracking-tight">{guess}</span>
                <span className="ml-2 text-muted">BPM</span>
              </div>
              <Slider label="BPM guess" min={40} max={180} step={1} value={guess} onChange={setGuess} format={(v) => v} />
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" size="lg" onClick={submit}>
                  <Send className="size-4" />
                  Submit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void playRound(true)}
                  disabled={(currentRef.current?.replays ?? 0) >= 2}
                >
                  <RotateCcw className="size-4" />
                  Replay
                </Button>
              </div>
            </div>
          )}

          {phase === "feedback" && feedback && (
            <div className="space-y-5 text-center">
              <div className="rounded-(--radius-card) border border-line bg-surface px-6 py-5">
                <p className="text-[13px] text-muted">Actual tempo</p>
                <p className="tabular text-[40px] font-semibold">{feedback.actual}</p>
                <p className="mt-2 text-[14px] text-muted">
                  You guessed <span className="tabular text-fg">{guess}</span> · error{" "}
                  <span className="tabular text-fg">{round(feedback.error, 1)}%</span>
                </p>
                <p className="mt-1 text-[13px] text-subtle">Round credit {Math.round(feedback.credit * 100)}%</p>
              </div>
              <Button variant="primary" size="lg" onClick={next}>
                {roundsRef.current.length >= totalRounds ? "See results" : "Next round"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
