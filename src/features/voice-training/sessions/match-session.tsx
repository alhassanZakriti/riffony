"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, Volume2 } from "lucide-react";
import { MicMeter } from "@/components/audio/mic-meter";
import { SessionResults } from "@/components/training/session-results";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/controls";
import { resumeAudio } from "@/lib/audio/context";
import { playFeedback, playTone } from "@/lib/audio/sounds";
import { midiToNote } from "@/lib/music/notes";
import { SESSION_LENGTHS } from "@/lib/store/defaults";
import { useAppStore, type RecordOutcome } from "@/lib/store";
import { useFocusMode } from "@/hooks/training/use-focus-mode";
import { TIER_NAMES } from "@/features/gamification/tiers";
import { formatMs, formatPercent, mean, pick, round } from "@/lib/utils";
import type { Tier } from "@/types";
import { PitchMeter } from "../components/pitch-meter";
import { recordVoiceSession } from "../progression";
import { evaluateSungPitch, feedbackForCents, scoreVoiceMatch, type VoiceTrial } from "../scoring";
import { midiLabel, poolMatchMidis } from "../theory";
import { voiceHintsForTier } from "../types";
import { useVoiceEngine } from "../use-voice-engine";

type Phase = "ready" | "running" | "results";

export function MatchSession({ tier, onExit }: { tier: Tier; onExit: () => void }) {
  const settings = useAppStore((s) => s.settings);
  const recordSession = useAppStore((s) => s.recordSession);
  const setLastTier = useAppStore((s) => s.setLastTier);
  const voiceProgress = useAppStore((s) => s.voiceProgress);
  const setVoiceProgress = useAppStore((s) => s.setVoiceProgress);
  const hints = voiceHintsForTier(tier);
  const engine = useVoiceEngine();

  const [phase, setPhase] = useState<Phase>("ready");
  const [target, setTarget] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [liveCents, setLiveCents] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [live, setLive] = useState({ correct: 0, errors: 0, lastRt: null as number | null });
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);

  const trials = useRef<VoiceTrial[]>([]);
  const accepting = useRef(false);
  const targetRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const promptAt = useRef(0);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef("");
  const startPerf = useRef(0);
  const queueNextRef = useRef<() => void>(() => {});
  const total = SESSION_LENGTHS[settings.sessionLength].voiceTrials;

  useFocusMode(phase === "running");

  const clearMiss = () => {
    if (missTimer.current) clearTimeout(missTimer.current);
    missTimer.current = null;
  };

  const finish = useCallback(() => {
    accepting.current = false;
    setListening(false);
    clearMiss();
    engine.dispose();
    const scored = scoreVoiceMatch(trials.current, tier);
    const correct = trials.current.filter((t) => t.correct);
    const rts = correct.map((t) => t.reactionMs!).filter(Boolean);
    const avgCents = correct.length ? mean(correct.map((t) => Math.abs(t.cents ?? 0))) : 0;
    const result = recordSession({
      exercise: "voice-match",
      category: "voice",
      tier,
      startedAt: startedAt.current,
      durationMs: performance.now() - startPerf.current,
      score: scored.score,
      accuracy: trials.current.length ? correct.length / trials.current.length : 0,
      avgReactionMs: rts.length ? mean(rts) : null,
      bestReactionMs: rts.length ? Math.min(...rts) : null,
      correct: correct.length,
      errors: trials.current.length - correct.length,
      breakdown: scored.components,
      stats: { avgCents, matchCents: hints.matchCents },
      configLabel: `${TIER_NAMES[tier]} · Pitch matching · ±${hints.matchCents}¢`,
      perfect: trials.current.length > 0 && correct.length === trials.current.length,
    });
    setVoiceProgress(
      recordVoiceSession(voiceProgress, "match", scored.score, correct.length, trials.current.length, avgCents),
    );
    setLastTier("voice-match", tier);
    setOutcome(result);
    setPhase("results");
  }, [engine, hints.matchCents, recordSession, setLastTier, setVoiceProgress, tier, voiceProgress]);

  const queueNext = useCallback(() => {
    if (indexRef.current >= total) {
      finish();
      return;
    }
    accepting.current = false;
    setListening(false);
    setFlash(null);
    setLiveCents(null);
    clearMiss();

    const pool = poolMatchMidis(tier, voiceProgress.comfortableLowMidi, voiceProgress.comfortableHighMidi);
    let next = pick(pool);
    if (pool.length > 1 && next === targetRef.current) next = pick(pool.filter((n) => n !== next));
    targetRef.current = next;
    setTarget(next);
    setIndex(indexRef.current);
    promptAt.current = performance.now();
    engine.resetTracking();

    void resumeAudio().then((ctx) => {
      playTone(next, ctx.currentTime + 0.05, 0.7, engine.volume * 0.55);
    });

    window.setTimeout(() => {
      accepting.current = true;
      setListening(true);
      missTimer.current = setTimeout(() => {
        if (!accepting.current) return;
        accepting.current = false;
        setListening(false);
        trials.current.push({
          targetMidi: next,
          detectedMidi: null,
          cents: null,
          correct: false,
          reactionMs: null,
        });
        setFlash("Time’s up — try matching the reference on the next note.");
        setLive((l) => ({ ...l, errors: l.errors + 1 }));
        if (engine.feedbackSounds) playFeedback("error", engine.volume * 0.4);
        indexRef.current += 1;
        queueNextRef.current();
      }, hints.trialTimeoutMs);
    }, 700);
  }, [
    engine,
    finish,
    hints.trialTimeoutMs,
    tier,
    total,
    voiceProgress.comfortableHighMidi,
    voiceProgress.comfortableLowMidi,
  ]);

  queueNextRef.current = queueNext;

  useEffect(() => {
    engine.onStableNote((note) => {
      if (!accepting.current || targetRef.current == null) return;
      const ev = evaluateSungPitch(targetRef.current, note.midi, note.cents, hints.matchCents);
      setLiveCents(ev.signedCents);
      if (!ev.correct) return;
      accepting.current = false;
      setListening(false);
      clearMiss();
      const rt = Math.max(0, note.onsetTime - promptAt.current);
      trials.current.push({
        targetMidi: targetRef.current,
        detectedMidi: note.midi,
        cents: ev.signedCents,
        correct: true,
        reactionMs: rt,
      });
      setFlash(feedbackForCents(ev.signedCents, hints.matchCents));
      setLive((l) => ({ correct: l.correct + 1, errors: l.errors, lastRt: rt }));
      if (engine.feedbackSounds) playFeedback("success", engine.volume * 0.45);
      indexRef.current += 1;
      window.setTimeout(() => queueNextRef.current(), 650);
    });
  }, [engine, hints.matchCents]);

  useEffect(() => {
    if (!listening || targetRef.current == null || engine.frame?.midi == null || engine.frame.cents == null) return;
    setLiveCents((engine.frame.midi - targetRef.current) * 100 + engine.frame.cents);
  }, [engine.frame, listening]);

  const begin = async () => {
    const ok = await engine.start();
    if (!ok) return;
    trials.current = [];
    indexRef.current = 0;
    setLive({ correct: 0, errors: 0, lastRt: null });
    setOutcome(null);
    startedAt.current = new Date().toISOString();
    startPerf.current = performance.now();
    setPhase("running");
    queueNext();
  };

  const replay = async () => {
    if (!hints.allowReplay || targetRef.current == null) return;
    const ctx = await resumeAudio();
    playTone(targetRef.current, ctx.currentTime + 0.02, 0.7, engine.volume * 0.55);
  };

  if (phase === "results" && outcome) {
    return <SessionResults outcome={outcome} onRetry={onExit} dashboardHref="/voice" />;
  }

  if (phase === "ready") {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-muted">
          Hear a clean reference tone, then sing the same pitch. Exact octave is required. Stop if anything feels
          strained — this is musical practice, not a range contest.
        </p>
        {engine.error && <p className="text-[13px] text-error">{engine.error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="lg" onClick={() => void begin()}>
            <Play className="size-4" />
            Start · {total} notes
          </Button>
          <Button variant="ghost" onClick={onExit}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const progress = total ? index / total : 0;
  const name = target != null ? midiLabel(target) : "…";

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center gap-5 px-2 py-6">
      <div className="flex w-full items-center justify-between text-[13px] text-muted">
        <span>
          Note <span className="tabular text-fg">{Math.min(index + 1, total)}</span> / {total}
        </span>
        <span className="tabular">
          {live.correct} correct · {formatPercent(index ? live.correct / Math.max(index, 1) : 0)}
        </span>
      </div>
      <ProgressBar value={progress} className="w-full" label="Progress" />

      <div className="flex size-40 flex-col items-center justify-center rounded-full border border-line-strong bg-elevated">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Sing</span>
        <span className="mt-1 tabular text-[40px] font-semibold">{hints.showTargetName ? name : "♪"}</span>
        {target != null && hints.showTargetName && (
          <span className="mt-1 text-[11px] text-subtle">{round(midiToNote(target).frequency, 1)} Hz</span>
        )}
      </div>

      <PitchMeter signedCents={liveCents} toleranceCents={hints.matchCents} active={listening} />

      <div className="w-full max-w-sm space-y-2">
        <MicMeter level={engine.level} peak={engine.level} gate={engine.gate} />
        <p className="text-center text-[12px] text-muted">
          Hearing:{" "}
          <span className="tabular text-fg">
            {engine.frame?.midi != null ? midiToNote(engine.frame.midi).name : "—"}
          </span>
          {liveCents != null && (
            <span className="ml-2 tabular text-subtle">
              {liveCents > 0 ? "+" : ""}
              {round(liveCents)}¢
            </span>
          )}
        </p>
      </div>

      {flash && <p className="text-center text-[14px] font-medium text-fg">{flash}</p>}
      {live.lastRt != null && flash?.startsWith("Excellent") && (
        <p className="text-[12px] text-success">{formatMs(live.lastRt)}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {hints.allowReplay && (
          <Button variant="secondary" size="sm" onClick={() => void replay()}>
            <Volume2 className="size-4" /> Replay tone
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={finish}>
          <Square className="size-4" /> End
        </Button>
      </div>
    </div>
  );
}
