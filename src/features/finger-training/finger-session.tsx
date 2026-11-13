"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { DualHands } from "@/components/hands/hand-svg";
import { PageHeader } from "@/components/training/page-header";
import { SessionResults } from "@/components/training/session-results";
import { TierSelector } from "@/components/training/tier-selector";
import { Button } from "@/components/ui/button";
import { Badge, Kbd, ProgressBar, Switch } from "@/components/ui/controls";
import { Segmented } from "@/components/ui/segmented";
import { Card, CardBody } from "@/components/ui/card";
import { playFeedback } from "@/lib/audio/sounds";
import { resumeAudio } from "@/lib/audio/context";
import { SESSION_LENGTHS } from "@/lib/store/defaults";
import { useAppStore, type RecordOutcome } from "@/lib/store";
import { scoreFingers, type FingerTrial } from "@/lib/scoring/fingers";
import { useFocusMode } from "@/hooks/training/use-focus-mode";
import { useKeyPress } from "@/hooks/keyboard/use-key-press";
import { bestScoreForTier, highestUnlockedTier, TIER_NAMES, tierProgress } from "@/features/gamification/tiers";
import { cn, formatMs, formatPercent, mean, pick } from "@/lib/utils";
import type { FingerId, Tier } from "@/types";
import {
  ALL_FINGERS,
  FINGER_MODE_LABEL,
  TIER_FINGER_WINDOW,
  assistForTier,
  challengeWindow,
  fingerDisplay,
  fingersForCode,
  poolForMode,
  shortcutFor,
  type FingerMode,
} from "./fingers";

type Phase = "setup" | "countdown" | "running" | "results";

const MODE_STATS: Record<FingerMode, number> = {
  individual: 0,
  random: 1,
  left: 2,
  right: 3,
  challenge: 4,
};

export function FingerSession() {
  const settings = useAppStore((s) => s.settings);
  const sessions = useAppStore((s) => s.sessions);
  const recordSession = useAppStore((s) => s.recordSession);
  const setLastTier = useAppStore((s) => s.setLastTier);
  const unlocked = highestUnlockedTier(sessions, "fingers");
  const lastTier = useAppStore((s) => s.lastTier.fingers ?? 0);
  const progressInfo = tierProgress(sessions, "fingers");
  const bestByTier = bestScoreForTier(sessions, "fingers");
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [tier, setTier] = useState<Tier>(Math.min(lastTier, unlocked) as Tier);
  const assist = assistForTier(tier, {
    showFingerHands: settings.showFingerHands,
    showFingerAnatomicalNames: settings.showFingerAnatomicalNames,
  });
  const [mode, setMode] = useState<FingerMode>("random");
  const [individual, setIndividual] = useState<FingerId>("right-index");
  const [phase, setPhase] = useState<Phase>("setup");
  const [countdown, setCountdown] = useState(3);
  const [target, setTarget] = useState<FingerId | null>(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "missed" | null>(null);
  const [live, setLive] = useState({ correct: 0, errors: 0, lastRt: null as number | null });
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);

  const trialsRef = useRef<FingerTrial[]>([]);
  const falseStartsRef = useRef(0);
  const promptAtRef = useRef(0);
  const windowMsRef = useRef(1400);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTrials = SESSION_LENGTHS[settings.sessionLength].fingerTrials;
  const startedAtIso = useRef("");
  const startPerf = useRef(0);
  const acceptingRef = useRef(false);
  const targetRef = useRef<FingerId | null>(null);
  const indexRef = useRef(0);

  useFocusMode(phase === "countdown" || phase === "running");

  const clearTimers = () => {
    if (missTimer.current) clearTimeout(missTimer.current);
    if (gapTimer.current) clearTimeout(gapTimer.current);
    missTimer.current = null;
    gapTimer.current = null;
  };

  const finish = useCallback(() => {
    clearTimers();
    acceptingRef.current = false;
    const trials = trialsRef.current;
    const scored = scoreFingers(trials, falseStartsRef.current);
    const correct = trials.filter((t) => t.outcome === "correct");
    const rts = correct.map((t) => t.reactionMs!).filter((n) => n != null);
    const result = recordSession({
      exercise: "fingers",
      category: "fingers",
      tier,
      startedAt: startedAtIso.current,
      durationMs: performance.now() - startPerf.current,
      score: scored.score,
      accuracy: trials.length ? correct.length / trials.length : 0,
      avgReactionMs: rts.length ? mean(rts) : null,
      bestReactionMs: rts.length ? Math.min(...rts) : null,
      correct: correct.length,
      errors: trials.length - correct.length,
      breakdown: scored.components,
      stats: {
        mode: MODE_STATS[mode],
        falseStarts: falseStartsRef.current,
        missed: trials.filter((t) => t.outcome === "missed").length,
      },
      configLabel: `${FINGER_MODE_LABEL[mode]} · ${TIER_NAMES[tier]} · ${trials.length} trials`,
      perfect: trials.length > 0 && correct.length === trials.length && falseStartsRef.current === 0,
    });
    setLastTier("fingers", tier);
    setOutcome(result);
    setPhase("results");
    setTarget(null);
  }, [mode, recordSession, setLastTier, tier]);

  const queueNext = useCallback(() => {
    const nextIndex = indexRef.current;
    if (nextIndex >= totalTrials) {
      finish();
      return;
    }
    acceptingRef.current = false;
    setTarget(null);
    targetRef.current = null;
    setFeedback(null);
    gapTimer.current = setTimeout(() => {
      const pool = poolForMode(mode, individual);
      // Avoid immediate repeats when the pool allows it.
      let next = pick(pool);
      if (pool.length > 1 && next === targetRef.current) next = pick(pool.filter((f) => f !== next));
      const base = TIER_FINGER_WINDOW[tier];
      const windowMs = mode === "challenge" ? challengeWindow(base, nextIndex) : base;
      windowMsRef.current = windowMs;
      targetRef.current = next;
      setTarget(next);
      setTrialIndex(nextIndex);
      promptAtRef.current = performance.now();
      acceptingRef.current = true;
      missTimer.current = setTimeout(() => {
        if (!acceptingRef.current) return;
        acceptingRef.current = false;
        trialsRef.current.push({
          target: next,
          pressed: null,
          outcome: "missed",
          reactionMs: null,
          windowMs,
        });
        setLive((l) => ({ ...l, errors: l.errors + 1, lastRt: null }));
        setFeedback("missed");
        if (settings.feedbackSounds) playFeedback("error", settings.masterVolume * 0.45);
        indexRef.current = nextIndex + 1;
        queueNext();
      }, windowMs);
    }, mode === "challenge" ? 280 : 420);
  }, [finish, individual, mode, settings.feedbackSounds, settings.masterVolume, tier, totalTrials]);

  const begin = async () => {
    if (settings.feedbackSounds) await resumeAudio();
    trialsRef.current = [];
    falseStartsRef.current = 0;
    indexRef.current = 0;
    setLive({ correct: 0, errors: 0, lastRt: null });
    setOutcome(null);
    startedAtIso.current = new Date().toISOString();
    startPerf.current = performance.now();
    setLastTier("fingers", tier);
    setPhase("countdown");
    setCountdown(3);
  };

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("running");
      queueNext();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown, queueNext]);

  useEffect(() => () => clearTimers(), []);

  const onKey = useCallback(
    (code: string, e: KeyboardEvent) => {
      if (phase === "countdown" || (phase === "running" && !acceptingRef.current)) {
        if (phase === "running" || phase === "countdown") {
          e.preventDefault();
          falseStartsRef.current += 1;
        }
        return;
      }
      if (phase !== "running" || !acceptingRef.current || !targetRef.current) return;
      e.preventDefault();

      const pressed = fingersForCode(settings.keyMapping, code);
      if (pressed.length === 0) return;

      acceptingRef.current = false;
      clearTimers();
      const targetId = targetRef.current;
      const rt = performance.now() - promptAtRef.current;
      // Space maps to both thumbs — correct if the instructed thumb is in the pressed set.
      const correct = pressed.includes(targetId);
      trialsRef.current.push({
        target: targetId,
        pressed,
        outcome: correct ? "correct" : "wrong",
        reactionMs: rt,
        windowMs: windowMsRef.current,
      });
      setLive((l) => ({
        correct: l.correct + (correct ? 1 : 0),
        errors: l.errors + (correct ? 0 : 1),
        lastRt: correct ? rt : l.lastRt,
      }));
      setFeedback(correct ? "correct" : "wrong");
      if (settings.feedbackSounds) {
        playFeedback(correct ? "success" : "error", settings.masterVolume * 0.5);
      }
      indexRef.current += 1;
      queueNext();
    },
    [phase, queueNext, settings.feedbackSounds, settings.keyMapping, settings.masterVolume],
  );

  useKeyPress(onKey, phase === "countdown" || phase === "running");

  if (phase === "results" && outcome) {
    return <SessionResults outcome={outcome} onRetry={() => setPhase("setup")} dashboardHref="/fingers" />;
  }

  const display = target ? fingerDisplay(target) : null;
  const progress = totalTrials ? trialIndex / totalTrials : 0;

  return (
    <div className={phase === "setup" ? "mx-auto max-w-3xl" : undefined}>
      {phase === "setup" && (
        <>
          <PageHeader
            eyebrow="Fingers · Coordination"
            title="Finger Training"
            description="Build finger independence and reaction speed with a clear visual → key mapping."
          />
        <Card className="mb-6">
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-medium">PIMA Finger Training</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Press the highlighted finger’s key as quickly and accurately as you can. Space is shared by both thumbs —
                  follow the on-screen hand.
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

            <div className="space-y-2">
              <label className="text-[12px] text-muted">Mode</label>
              <Segmented
                label="Mode"
                value={mode}
                onChange={setMode}
                options={(Object.keys(FINGER_MODE_LABEL) as FingerMode[]).map((m) => ({
                  value: m,
                  label: FINGER_MODE_LABEL[m],
                }))}
              />
            </div>

            {mode === "individual" && (
              <div className="space-y-2">
                <label className="text-[12px] text-muted">Finger</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_FINGERS.map((id) => {
                    const d = fingerDisplay(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setIndividual(id)}
                        className={cn(
                          "rounded-[8px] border px-2.5 py-1.5 text-[12px]",
                          individual === id ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg",
                        )}
                      >
                        {d.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-elevated/40 px-4 py-3">
              <div>
                <div className="text-[13px] text-fg">Show hand illustrations</div>
                <div className="text-[12px] text-muted">Does not affect scoring. Higher tiers hide hands by default.</div>
              </div>
              <Switch
                label="Show hands"
                checked={settings.showFingerHands}
                onChange={(v) => updateSettings({ showFingerHands: v })}
              />
            </div>

            <div className="rounded-[12px] border border-line bg-elevated/40 p-4">
              <p className="mb-3 text-[12px] text-muted">PIMA map (pinky = C). Keys editable in Settings.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["left", "right"] as const).map((hand) => (
                  <div key={hand} className="space-y-1.5">
                    <div className="text-[12px] font-medium text-fg">{hand === "left" ? "Left" : "Right"}</div>
                    {ALL_FINGERS.filter((f) => f.startsWith(hand)).map((id) => {
                      const d = fingerDisplay(id);
                      return (
                        <div key={id} className="flex items-center justify-between text-[12px] text-muted">
                          <span>
                            {d.pima}
                            <span className="ml-1.5 text-subtle">({d.fingerLabel})</span>
                          </span>
                          <Kbd size="sm">{shortcutFor(settings.keyMapping, id)}</Kbd>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <Button variant="primary" size="lg" onClick={() => void begin()}>
              <Play className="size-4" />
              Start · {totalTrials} trials
            </Button>
          </CardBody>
        </Card>
        </>
      )}

      {(phase === "countdown" || phase === "running") && (
        <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-4 py-8">
          <div className="flex w-full items-center justify-between text-[13px] text-muted">
            <span>
              Trial <span className="tabular text-fg">{Math.min(trialIndex + 1, totalTrials)}</span> / {totalTrials}
            </span>
            <span className="tabular">
              {live.correct} correct · {formatPercent(trialIndex ? live.correct / Math.max(trialIndex, 1) : 0)}
            </span>
          </div>
          <ProgressBar value={progress} label="Session progress" className="w-full" />

          {phase === "countdown" ? (
            <div className="tabular text-[72px] font-semibold text-fg">{countdown || "Go"}</div>
          ) : (
            <>
              {assist.showHands && (
                <DualHands target={assist.highlightFinger ? target : null} />
              )}
              <div className="text-center">
                {display ? (
                  <>
                    <p className="text-[12px] uppercase tracking-[0.12em] text-muted">{display.handShort}</p>
                    <h2 className="mt-1 text-[40px] font-semibold tracking-tight">
                      {assist.showPima ? display.pima : display.fingerLabel}
                      {assist.showAnatomicalName && assist.showPima && (
                        <span className="ml-2 text-[22px] font-medium text-muted">({display.fingerLabel})</span>
                      )}
                      {assist.showAnatomicalName && !assist.showPima && display.fingerLabel}
                    </h2>
                    {assist.showKeyboardHint && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="text-[13px] text-muted">Press</span>
                        <Kbd size="lg">
                          {shortcutFor(
                            settings.keyMapping,
                            display.hand === "left" ? `left-${display.finger}` : `right-${display.finger}`,
                          )}
                        </Kbd>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[15px] text-muted">Get ready…</p>
                )}
                {feedback && (
                  <p
                    className={cn(
                      "mt-3 text-[14px] font-medium",
                      feedback === "correct" ? "text-success" : "text-error",
                    )}
                  >
                    {feedback === "correct" ? `Correct · ${formatMs(live.lastRt)}` : feedback === "missed" ? "Missed" : "Wrong key"}
                  </p>
                )}
              </div>
            </>
          )}

          <Button variant="ghost" onClick={finish}>
            <Square className="size-4" />
            End session
          </Button>
        </div>
      )}
    </div>
  );
}
