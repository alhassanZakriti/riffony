"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, Volume2 } from "lucide-react";
import { MicMeter } from "@/components/audio/mic-meter";
import { SessionResults } from "@/components/training/session-results";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/controls";
import { resumeAudio } from "@/lib/audio/context";
import { LookaheadScheduler } from "@/lib/audio/scheduler";
import { playFeedback, playTone } from "@/lib/audio/sounds";
import { midiToNote } from "@/lib/music/notes";
import { useAppStore, type RecordOutcome } from "@/lib/store";
import { useFocusMode } from "@/hooks/training/use-focus-mode";
import { TIER_NAMES } from "@/features/gamification/tiers";
import { cn, formatPercent, mean, pick, round } from "@/lib/utils";
import type { Tier } from "@/types";
import { PitchMeter } from "../components/pitch-meter";
import { recordVoiceSession } from "../progression";
import { evaluateSungPitch, scoreStability, scoreVoiceMatch, type VoiceTrial } from "../scoring";
import {
  INTERVALS_BY_TIER,
  SCALE_LABEL,
  SCALE_STEPS,
  VOICE_SEED_MIDI,
  clampComfortable,
  midiLabel,
  pickRoot,
  scalesForTier,
} from "../theory";
import { VOICE_EXERCISE, VOICE_MODE_LABEL, voiceHintsForTier, type VoiceMode } from "../types";
import { useVoiceEngine } from "../use-voice-engine";

type Phase = "ready" | "running" | "results";

const WARMUPS = [
  {
    id: "hum",
    title: "Gentle humming",
    blurb: "Hum a comfortable pitch softly for a few seconds. Keep the jaw relaxed.",
  },
  {
    id: "siren",
    title: "Soft siren",
    blurb: "Glide smoothly up and down a small comfortable range — never push the edges.",
  },
  {
    id: "vowels",
    title: "Easy vowels",
    blurb: "Sustain ah / eh / oh on a mid pitch. Stop immediately if you feel strain.",
  },
] as const;

export function GuidedVoiceSession({
  mode,
  tier,
  onExit,
}: {
  mode: Exclude<VoiceMode, "match">;
  tier: Tier;
  onExit: () => void;
}) {
  const recordSession = useAppStore((s) => s.recordSession);
  const setLastTier = useAppStore((s) => s.setLastTier);
  const voiceProgress = useAppStore((s) => s.voiceProgress);
  const setVoiceProgress = useAppStore((s) => s.setVoiceProgress);
  const hints = voiceHintsForTier(tier);
  const engine = useVoiceEngine();

  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [liveCents, setLiveCents] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [live, setLive] = useState({ correct: 0, errors: 0 });
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);
  const [stabilitySamples, setStabilitySamples] = useState<number[]>([]);
  const [rangeHits, setRangeHits] = useState<number[]>([]);

  const trials = useRef<VoiceTrial[]>([]);
  const accepting = useRef(false);
  const targetRef = useRef<number | null>(null);
  const sequenceRef = useRef<number[]>([]);
  const seqIdx = useRef(0);
  const totalRef = useRef(8);
  const startedAt = useRef("");
  const startPerf = useRef(0);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduler = useRef(new LookaheadScheduler());
  const advanceRef = useRef<() => void>(() => {});
  const samplesRef = useRef<number[]>([]);

  useFocusMode(phase === "running");

  useEffect(() => () => {
    scheduler.current.stop();
    if (missTimer.current) clearTimeout(missTimer.current);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const playMidi = async (midi: number, dur = 0.55) => {
    const ctx = await resumeAudio();
    playTone(midi, ctx.currentTime + 0.03, dur, engine.volume * 0.55);
  };

  const playSequence = async (midis: number[]) => {
    const ctx = await resumeAudio();
    const events = midis.map((m, i) => ({
      time: ctx.currentTime + 0.08 + i * 0.55,
      play: (t: number) => playTone(m, t, 0.45, engine.volume * 0.55),
    }));
    scheduler.current.stop();
    scheduler.current.start(events);
  };

  const finish = useCallback(
    (extraStats: Record<string, number> = {}, range?: { low: number; high: number }) => {
      accepting.current = false;
      setListening(false);
      engine.dispose();
      scheduler.current.stop();

      let scored;
      let accuracy: number;
      let correctCount: number;
      let attempts: number;
      let avgCents: number;

      if (mode === "stability") {
        scored = scoreStability(samplesRef.current, targetRef.current ?? VOICE_SEED_MIDI, hints.matchCents);
        accuracy = scored.components.find((c) => c.id === "accuracy")?.value ?? 0;
        correctCount = accuracy >= 0.7 ? 1 : 0;
        attempts = 1;
        avgCents = mean(samplesRef.current.map((m) => Math.abs((m - (targetRef.current ?? VOICE_SEED_MIDI)) * 100)));
      } else {
        scored = scoreVoiceMatch(trials.current, tier);
        const correct = trials.current.filter((t) => t.correct);
        correctCount = correct.length;
        attempts = trials.current.length || 1;
        accuracy = correctCount / attempts;
        avgCents = correct.length ? mean(correct.map((t) => Math.abs(t.cents ?? 0))) : 0;
      }

      const exercise = VOICE_EXERCISE[mode];
      const result = recordSession({
        exercise,
        category: "voice",
        tier,
        startedAt: startedAt.current,
        durationMs: performance.now() - startPerf.current,
        score: scored.score,
        accuracy,
        avgReactionMs: null,
        bestReactionMs: null,
        correct: correctCount,
        errors: Math.max(0, attempts - correctCount),
        breakdown: scored.components,
        stats: {
          avgCents,
          stability: mode === "stability" ? accuracy : 0,
          ...extraStats,
        },
        configLabel: `${TIER_NAMES[tier]} · ${VOICE_MODE_LABEL[mode]}`,
        perfect: accuracy === 1 && attempts > 0,
      });
      setVoiceProgress(
        recordVoiceSession(voiceProgress, mode, scored.score, correctCount, attempts, avgCents, range),
      );
      setLastTier(exercise, tier);
      setOutcome(result);
      setPhase("results");
    },
    [engine, hints.matchCents, mode, recordSession, setLastTier, setVoiceProgress, tier, voiceProgress],
  );

  const registerHit = (detectedMidi: number, cents: number) => {
    if (!accepting.current || targetRef.current == null) return;
    const ev = evaluateSungPitch(targetRef.current, detectedMidi, cents, hints.matchCents);
    setLiveCents(ev.signedCents);
    if (!ev.correct) return;
    accepting.current = false;
    setListening(false);
    if (missTimer.current) clearTimeout(missTimer.current);
    trials.current.push({
      targetMidi: targetRef.current,
      detectedMidi,
      cents: ev.signedCents,
      correct: true,
      reactionMs: null,
    });
    setLive((l) => ({ ...l, correct: l.correct + 1 }));
    setRangeHits((h) => [...h, targetRef.current!]);
    setMessage("Matched.");
    if (engine.feedbackSounds) playFeedback("success", engine.volume * 0.4);
    window.setTimeout(() => advanceRef.current(), 500);
  };

  useEffect(() => {
    engine.onStableNote((note) => registerHit(note.midi, note.cents));
  });

  useEffect(() => {
    if (!listening || !engine.frame?.voiced || engine.frame.midi == null) return;
    if (mode === "stability" && targetRef.current != null) {
      const mf = engine.frame.midi + (engine.frame.cents ?? 0) / 100;
      samplesRef.current.push(mf);
      setStabilitySamples([...samplesRef.current]);
      setLiveCents((mf - targetRef.current) * 100);
    } else if (targetRef.current != null && engine.frame.cents != null) {
      setLiveCents((engine.frame.midi - targetRef.current) * 100 + engine.frame.cents);
    }
  }, [engine.frame, listening, mode]);

  const armListen = (timeoutMs: number) => {
    accepting.current = true;
    setListening(true);
    engine.resetTracking();
    if (missTimer.current) clearTimeout(missTimer.current);
    missTimer.current = setTimeout(() => {
      if (!accepting.current) return;
      accepting.current = false;
      setListening(false);
      if (targetRef.current != null) {
        trials.current.push({
          targetMidi: targetRef.current,
          detectedMidi: null,
          cents: null,
          correct: false,
          reactionMs: null,
        });
      }
      setLive((l) => ({ ...l, errors: l.errors + 1 }));
      setMessage("Missed — moving on gently.");
      if (engine.feedbackSounds) playFeedback("error", engine.volume * 0.35);
      advanceRef.current();
    }, timeoutMs);
  };

  const setupStep = useCallback(
    (i: number) => {
      setStep(i);
      setMessage(null);
      setLiveCents(null);

      if (mode === "warmup") {
        if (i >= WARMUPS.length) {
          finish({ warmups: WARMUPS.length });
          return;
        }
        const w = WARMUPS[i];
        const root = clampComfortable(
          VOICE_SEED_MIDI,
          voiceProgress.comfortableLowMidi,
          voiceProgress.comfortableHighMidi,
        );
        targetRef.current = root;
        setTarget(root);
        setPrompt(`${w.title}: ${w.blurb}`);
        void playMidi(root, 0.8);
        armListen(10000);
        return;
      }

      if (mode === "range") {
        if (i >= 10) {
          const hits = [...new Set(rangeHits.length ? rangeHits : trials.current.filter((t) => t.correct).map((t) => t.targetMidi))];
          if (hits.length >= 2) {
            finish({ rangeNotes: hits.length }, { low: Math.min(...hits), high: Math.max(...hits) });
          } else {
            finish({ rangeNotes: hits.length });
          }
          return;
        }
        const center = VOICE_SEED_MIDI;
        const delta = i % 2 === 0 ? -Math.floor(i / 2) : Math.ceil(i / 2);
        const midi = clampComfortable(center + delta, null, null, 50, 67);
        targetRef.current = midi;
        setTarget(midi);
        setPrompt(`Comfortably sing ${midiLabel(midi)}. Skip anything that feels forced.`);
        void playMidi(midi);
        armListen(8000);
        return;
      }

      if (mode === "intervals") {
        if (i >= totalRef.current) {
          finish();
          return;
        }
        const pool = INTERVALS_BY_TIER[tier];
        // Include easier tiers' intervals as review.
        const all = [...INTERVALS_BY_TIER[0], ...(tier >= 1 ? INTERVALS_BY_TIER[1] : []), ...(tier >= 2 ? INTERVALS_BY_TIER[2] : []), ...(tier >= 3 ? INTERVALS_BY_TIER[3] : [])];
        const use = tier === 0 ? pool : all;
        const interval = pick(use);
        const ascending = Math.random() > 0.35;
        const root = pickRoot(tier, voiceProgress.comfortableLowMidi, voiceProgress.comfortableHighMidi);
        const answer = ascending ? root + interval.semitones : root - interval.semitones;
        const safe = clampComfortable(
          answer,
          voiceProgress.comfortableLowMidi,
          voiceProgress.comfortableHighMidi,
          48,
          72,
        );
        // If clamp changed the answer too much, re-root
        const finalRoot = ascending ? safe - interval.semitones : safe + interval.semitones;
        targetRef.current = safe;
        setTarget(safe);
        setPrompt(
          `Root ${midiLabel(finalRoot)} → sing a ${interval.label} ${ascending ? "up" : "down"} (${midiLabel(safe)})`,
        );
        void (async () => {
          await playMidi(finalRoot, 0.5);
          await new Promise((r) => setTimeout(r, 550));
          if (tier <= 1) await playMidi(safe, 0.45);
          armListen(hints.trialTimeoutMs);
        })();
        return;
      }

      if (mode === "scales") {
        const scaleId = pick(scalesForTier(tier));
        if (i === 0) {
          const root = pickRoot(Math.min(tier, 1) as Tier, voiceProgress.comfortableLowMidi, voiceProgress.comfortableHighMidi);
          sequenceRef.current = SCALE_STEPS[scaleId].map((s) => root + s);
          seqIdx.current = 0;
          setPrompt(`Sing the ${SCALE_LABEL[scaleId]} scale starting on ${midiLabel(root)}`);
          if (tier <= 1) void playSequence(sequenceRef.current);
          else void playMidi(root);
        }
        if (seqIdx.current >= sequenceRef.current.length) {
          finish({ scaleNotes: sequenceRef.current.length });
          return;
        }
        const midi = sequenceRef.current[seqIdx.current];
        targetRef.current = midi;
        setTarget(midi);
        setPrompt(`Degree ${seqIdx.current + 1}: sing ${hints.showTargetName ? midiLabel(midi) : "the next scale note"}`);
        armListen(hints.trialTimeoutMs);
        return;
      }

      if (mode === "stability") {
        if (i >= 1) {
          finish({ stability: 1 });
          return;
        }
        const root = pickRoot(tier, voiceProgress.comfortableLowMidi, voiceProgress.comfortableHighMidi);
        targetRef.current = root;
        setTarget(root);
        samplesRef.current = [];
        setStabilitySamples([]);
        setPrompt(`Sing and gently hold ${midiLabel(root)} for ~4 seconds. Soft vibrato is OK.`);
        void playMidi(root, 0.7);
        window.setTimeout(() => {
          accepting.current = true;
          setListening(true);
          engine.resetTracking();
          holdTimer.current = setTimeout(() => {
            accepting.current = false;
            setListening(false);
            finish({
              sampleCount: samplesRef.current.length,
            });
          }, 4200);
        }, 800);
        return;
      }

      // melody
      if (i >= totalRef.current) {
        finish();
        return;
      }
      if (seqIdx.current === 0 || i === 0) {
        const len = tier === 0 ? 3 : tier === 1 ? 4 : tier === 2 ? 5 : 6;
        const root = pickRoot(0, voiceProgress.comfortableLowMidi, voiceProgress.comfortableHighMidi);
        const steps = [0];
        while (steps.length < len) {
          const delta = pick([-2, -1, 0, 1, 2, 3]);
          steps.push(steps[steps.length - 1] + delta);
        }
        sequenceRef.current = steps.map((s) =>
          clampComfortable(root + s, voiceProgress.comfortableLowMidi, voiceProgress.comfortableHighMidi),
        );
        seqIdx.current = 0;
        setPrompt("Listen to the phrase, then sing it back note by note.");
        void (async () => {
          await playSequence(sequenceRef.current);
          await new Promise((r) => setTimeout(r, sequenceRef.current.length * 550 + 400));
          const midi = sequenceRef.current[0];
          targetRef.current = midi;
          setTarget(midi);
          setPrompt(`Sing note 1 of ${sequenceRef.current.length}`);
          armListen(hints.trialTimeoutMs);
        })();
        return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional step machine
    [mode, tier, hints, voiceProgress, engine, finish, rangeHits],
  );

  advanceRef.current = () => {
    if (mode === "scales" || mode === "melody") {
      seqIdx.current += 1;
      if (mode === "scales" && seqIdx.current >= sequenceRef.current.length) {
        finish({ scaleNotes: sequenceRef.current.length });
        return;
      }
      if (mode === "melody") {
        if (seqIdx.current >= sequenceRef.current.length) {
          // next phrase
          setupStep(step + 1);
          seqIdx.current = 0;
          return;
        }
        const midi = sequenceRef.current[seqIdx.current];
        targetRef.current = midi;
        setTarget(midi);
        setPrompt(`Sing note ${seqIdx.current + 1} of ${sequenceRef.current.length}`);
        armListen(hints.trialTimeoutMs);
        return;
      }
      // scales continue
      const midi = sequenceRef.current[seqIdx.current];
      targetRef.current = midi;
      setTarget(midi);
      setStep((s) => s + 1);
      setPrompt(`Degree ${seqIdx.current + 1}: sing ${hints.showTargetName ? midiLabel(midi) : "next"}`);
      armListen(hints.trialTimeoutMs);
      return;
    }
    setupStep(step + 1);
  };

  const begin = async () => {
    const ok = await engine.start();
    if (!ok) return;
    trials.current = [];
    samplesRef.current = [];
    seqIdx.current = 0;
    totalRef.current = mode === "intervals" || mode === "melody" ? (tier === 0 ? 6 : 8) : 8;
    setLive({ correct: 0, errors: 0 });
    setRangeHits([]);
    setOutcome(null);
    startedAt.current = new Date().toISOString();
    startPerf.current = performance.now();
    setPhase("running");
    setupStep(0);
  };

  if (phase === "results" && outcome) {
    return <SessionResults outcome={outcome} onRetry={onExit} dashboardHref="/voice" />;
  }

  if (phase === "ready") {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-muted">
          {VOICE_MODE_LABEL[mode]} · {TIER_NAMES[tier]}. Practice gently. Leave any note that feels uncomfortable.
        </p>
        {mode === "range" && (
          <p className="text-[13px] text-subtle">
            Range exploration is an estimate of comfortable pitches only — not a voice-type diagnosis.
          </p>
        )}
        {engine.error && <p className="text-[13px] text-error">{engine.error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="lg" onClick={() => void begin()}>
            <Play className="size-4" />
            Start
          </Button>
          <Button variant="ghost" onClick={onExit}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const totalSteps =
    mode === "warmup" ? WARMUPS.length : mode === "stability" ? 1 : mode === "range" ? 10 : totalRef.current;

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center gap-5 px-2 py-6">
      <div className="flex w-full items-center justify-between text-[13px] text-muted">
        <span>{VOICE_MODE_LABEL[mode]}</span>
        <span className="tabular">
          {live.correct} matched · {formatPercent(live.correct + live.errors ? live.correct / (live.correct + live.errors) : 0)}
        </span>
      </div>
      <ProgressBar value={(step + (listening ? 0.4 : 0)) / totalSteps} className="w-full" label="Progress" />

      <p className="max-w-md text-center text-[15px] text-fg">{prompt}</p>

      {target != null && hints.showTargetName && mode !== "melody" && (
        <div className="tabular text-[36px] font-semibold">{midiLabel(target)}</div>
      )}

      <PitchMeter signedCents={liveCents} toleranceCents={hints.matchCents} active={listening} />

      {mode === "stability" && (
        <p className="text-[12px] text-subtle">Samples captured: {stabilitySamples.length}</p>
      )}

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

      {message && <p className={cn("text-[14px] font-medium", message === "Matched." ? "text-success" : "text-muted")}>{message}</p>}

      <div className="flex flex-wrap gap-2">
        {target != null && hints.allowReplay && mode !== "melody" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (target != null) void playMidi(target);
            }}
          >
            <Volume2 className="size-4" /> Replay
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (mode === "stability") finish({ sampleCount: samplesRef.current.length });
            else finish();
          }}
        >
          <Square className="size-4" /> End
        </Button>
      </div>
    </div>
  );
}
