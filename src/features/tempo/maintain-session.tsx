"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play, Square } from "lucide-react";
import { SessionResults } from "@/components/training/session-results";
import { TierSelector } from "@/components/training/tier-selector";
import { Button } from "@/components/ui/button";
import { Badge, ProgressBar } from "@/components/ui/controls";
import { Segmented } from "@/components/ui/segmented";
import { Card, CardBody } from "@/components/ui/card";
import { contextToPerformanceOffset, resumeAudio } from "@/lib/audio/context";
import { LookaheadScheduler } from "@/lib/audio/scheduler";
import { playClick, playFeedback } from "@/lib/audio/sounds";
import { subscribeMidiNoteOn } from "@/lib/audio/midi";
import { SESSION_LENGTHS } from "@/lib/store/defaults";
import { useAppStore, type RecordOutcome } from "@/lib/store";
import {
  analyzeTempo,
  isPerfectTempo,
  scoreTempo,
  type TimedEvent,
  type TempoAnalysis,
  type HitGrade,
} from "@/lib/scoring/tempo";
import { useFocusMode } from "@/hooks/training/use-focus-mode";
import { useKeyPress } from "@/hooks/keyboard/use-key-press";
import { bestScoreForTier, highestUnlockedTier, TIER_NAMES, tierProgress } from "@/features/gamification/tiers";
import { cn, formatClock, formatPercent } from "@/lib/utils";
import type { Tier } from "@/types";
import {
  SUBDIVISION_LABEL,
  TEMPO_TIERS,
  intervalMs,
  type Subdivision,
} from "./config";
import { TimingDeviationChart, timingCue } from "./timing-chart";

type Phase = "setup" | "running" | "paused" | "results";
type RunPhase = "guided" | "independent";

const GRADE_TONE: Record<HitGrade, string> = {
  perfect: "text-success",
  great: "text-accent",
  good: "text-warning",
  off: "text-error",
};

export function MaintainTempoSession({ header }: { header?: ReactNode }) {
  const settings = useAppStore((s) => s.settings);
  const sessions = useAppStore((s) => s.sessions);
  const recordSession = useAppStore((s) => s.recordSession);
  const setLastTier = useAppStore((s) => s.setLastTier);
  const lastTier = useAppStore((s) => s.lastTier["tempo-maintain"] ?? 0);
  const unlocked = highestUnlockedTier(sessions, "tempo");
  const progressInfo = tierProgress(sessions, "tempo");
  const bestByTier = bestScoreForTier(sessions, "tempo-maintain");

  const [tier, setTier] = useState<Tier>(Math.min(lastTier, unlocked) as Tier);
  const [bpm, setBpm] = useState(TEMPO_TIERS[tier].bpms.includes(100) ? 100 : TEMPO_TIERS[tier].bpms[0]);
  const [subdivision, setSubdivision] = useState<Subdivision>("quarter");
  const [phase, setPhase] = useState<Phase>("setup");
  const [runPhase, setRunPhase] = useState<RunPhase>("guided");
  const [flash, setFlash] = useState(0);
  const [live, setLive] = useState({
    hit: 0,
    missed: 0,
    accuracy: 0,
    lastGrade: null as HitGrade | null,
    lastDeviation: null as number | null,
  });
  const [elapsed, setElapsed] = useState(0);
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<TempoAnalysis | null>(null);

  const scheduler = useRef(new LookaheadScheduler());
  const expectedRef = useRef<TimedEvent[]>([]);
  const tapsRef = useRef<TimedEvent[]>([]);
  const segmentRef = useRef(0);
  const intervalRef = useRef(500);
  const countInRef = useRef(4);
  const scoringBeatsRef = useRef(48);
  const startPerfRef = useRef(0);
  const audioOffsetRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartedRef = useRef(0);
  const beatCursorRef = useRef(0);
  const runningRef = useRef(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtIso = useRef("");
  const configLabelRef = useRef("");

  useFocusMode(phase === "running" || phase === "paused");

  useEffect(() => {
    const cfg = TEMPO_TIERS[tier];
    if (!cfg.bpms.includes(bpm)) setBpm(cfg.bpms[0]);
    if (!cfg.subdivisions.includes(subdivision)) setSubdivision(cfg.subdivisions[0]);
  }, [tier, bpm, subdivision]);

  const finish = useCallback(() => {
    runningRef.current = false;
    scheduler.current.stop();
    const analysis = analyzeTempo(expectedRef.current, tapsRef.current, intervalRef.current);
    const scored = scoreTempo(analysis);
    const durationMs = performance.now() - startPerfRef.current - pausedAccumRef.current;
    const result = recordSession({
      exercise: "tempo-maintain",
      category: "tempo",
      tier,
      startedAt: startedAtIso.current,
      durationMs,
      score: scored.score,
      accuracy: analysis.expectedCount ? analysis.hits.length / analysis.expectedCount : 0,
      avgReactionMs: analysis.meanAbsDeviation || null,
      bestReactionMs: analysis.hits.length ? Math.min(...analysis.hits.map((h) => Math.abs(h.deviation))) : null,
      correct: analysis.hits.filter((h) => h.grade === "perfect" || h.grade === "great").length,
      errors: analysis.missed + analysis.extra + analysis.grades.off + analysis.grades.good,
      breakdown: scored.components,
      stats: {
        bpm,
        meanAbsDeviation: analysis.meanAbsDeviation,
        intervalCv: analysis.intervalCv,
        missed: analysis.missed,
        extra: analysis.extra,
        bpmErrorPct: analysis.bpmErrorPct,
      },
      configLabel: configLabelRef.current,
      perfect: isPerfectTempo(analysis),
    });
    setLastTier("tempo-maintain", tier);
    setLastAnalysis(analysis);
    setOutcome(result);
    setPhase("results");
    updateLive(analysis);
  }, [bpm, recordSession, setLastTier, tier]);

  const updateLive = (a: TempoAnalysis) => {
    const scoredBeats = Math.min(beatCursorRef.current, a.expectedCount);
    const last = a.hits.length ? a.hits[a.hits.length - 1] : null;
    setLive({
      hit: a.hits.length,
      missed: a.missed,
      accuracy: scoredBeats ? a.hits.length / Math.max(scoredBeats, 1) : 0,
      lastGrade: last?.grade ?? null,
      lastDeviation: last?.deviation ?? null,
    });
  };

  const scheduleFrom = useCallback(
    (audioStart: number, fromBeat: number) => {
      const total = countInRef.current + scoringBeatsRef.current;
      const events = [];
      for (let i = fromBeat; i < total; i++) {
        const time = audioStart + (i - fromBeat) * (intervalRef.current / 1000);
        const isCountIn = i < countInRef.current;
        const accent = (i - countInRef.current) % (subdivision === "triplet" ? 3 : subdivision === "eighth" ? 2 : 1) === 0;
        events.push({
          time,
          play: (t: number) => {
            // Guided count-in is audible; independent scoring beats keep the schedule silent.
            const audible = isCountIn;
            const handle = audible
              ? playClick(t, {
                  accent: isCountIn || accent,
                  sound: settings.metronomeSound,
                  volume: settings.metronomeVolume * settings.masterVolume,
                })
              : undefined;

            const perf = t * 1000 + audioOffsetRef.current;
            if (!isCountIn) {
              expectedRef.current.push({ time: perf, segment: segmentRef.current });
            }
            beatCursorRef.current = i + 1;
            if (i === countInRef.current) setRunPhase("independent");
            if (i < countInRef.current) setRunPhase("guided");

            const allowFlash = settings.showBeatFlash && (isCountIn || !TEMPO_TIERS[tier].hideVisualGuide);
            if (allowFlash) {
              setFlash((f) => f + 1);
              if (flashTimer.current) clearTimeout(flashTimer.current);
              flashTimer.current = setTimeout(() => setFlash(0), 90);
            }
            if (i + 1 >= total) {
              setTimeout(() => {
                if (runningRef.current) finish();
              }, intervalRef.current * 0.55);
            }
            return handle;
          },
        });
      }
      scheduler.current.start(events);
    },
    [finish, settings.masterVolume, settings.metronomeSound, settings.metronomeVolume, settings.showBeatFlash, subdivision, tier],
  );

  const start = async () => {
    await resumeAudio();
    const c = TEMPO_TIERS[tier];
    const length = SESSION_LENGTHS[settings.sessionLength];
    intervalRef.current = intervalMs(bpm, subdivision);
    countInRef.current = c.countIn;
    scoringBeatsRef.current = length.tempoBeats;
    expectedRef.current = [];
    tapsRef.current = [];
    segmentRef.current = 0;
    beatCursorRef.current = 0;
    pausedAccumRef.current = 0;
    startedAtIso.current = new Date().toISOString();
    startPerfRef.current = performance.now();
    configLabelRef.current = `${bpm} BPM · ${SUBDIVISION_LABEL[subdivision]} · ${TIER_NAMES[tier]}`;
    setLive({ hit: 0, missed: 0, accuracy: 0, lastGrade: null, lastDeviation: null });
    setElapsed(0);
    setOutcome(null);
    setLastAnalysis(null);
    setRunPhase("guided");
    setPhase("running");
    runningRef.current = true;
    setLastTier("tempo-maintain", tier);

    const ctx = await resumeAudio();
    audioOffsetRef.current = contextToPerformanceOffset(ctx) + settings.latencyOffsetMs;
    scheduleFrom(ctx.currentTime + 0.08, 0);
  };

  const pause = () => {
    if (phase !== "running") return;
    scheduler.current.stop();
    runningRef.current = false;
    pauseStartedRef.current = performance.now();
    setPhase("paused");
  };

  const resume = async () => {
    if (phase !== "paused") return;
    await resumeAudio();
    pausedAccumRef.current += performance.now() - pauseStartedRef.current;
    segmentRef.current += 1;
    runningRef.current = true;
    setPhase("running");
    const ctx = await resumeAudio();
    audioOffsetRef.current = contextToPerformanceOffset(ctx) + settings.latencyOffsetMs;
    scheduleFrom(ctx.currentTime + 0.08, beatCursorRef.current);
  };

  const stop = () => {
    runningRef.current = false;
    scheduler.current.stop();
    if (expectedRef.current.length > 0 || tapsRef.current.length > 0) finish();
    else setPhase("setup");
  };

  const registerTap = useCallback(
    (perfTime: number) => {
      if (phase !== "running") return;
      // Ignore taps during count-in (no expected beats yet).
      if (expectedRef.current.length === 0 && beatCursorRef.current <= countInRef.current) return;
      tapsRef.current.push({ time: perfTime + settings.latencyOffsetMs, segment: segmentRef.current });
      const analysis = analyzeTempo(expectedRef.current, tapsRef.current, intervalRef.current);
      updateLive(analysis);
      if (settings.feedbackSounds) {
        const last = analysis.hits[analysis.hits.length - 1];
        if (last && Math.abs(last.tapTime - (perfTime + settings.latencyOffsetMs)) < 2) {
          playFeedback(last.grade === "off" ? "error" : "tick", settings.masterVolume * 0.5);
        }
      }
    },
    [phase, settings.feedbackSounds, settings.latencyOffsetMs, settings.masterVolume],
  );

  useKeyPress((code, e) => {
    if (code === "Space" || code === "Enter") {
      e.preventDefault();
      registerTap(e.timeStamp || performance.now());
    }
  }, phase === "running");

  useEffect(() => {
    if (phase !== "running") return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void subscribeMidiNoteOn(() => {
      if (!cancelled) registerTap(performance.now());
    }).then((u) => {
      if (cancelled) u();
      else unsub = u;
    }).catch(() => {});
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [phase, registerTap]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setElapsed(performance.now() - startPerfRef.current - pausedAccumRef.current);
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => scheduler.current.stop(), []);

  if (phase === "results" && outcome) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <SessionResults outcome={outcome} onRetry={() => setPhase("setup")} dashboardHref="/tempo" />
        {lastAnalysis && (
          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-[14px] font-medium">Timing consistency</h2>
              <TimingDeviationChart analysis={lastAnalysis} />
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  const cfg = TEMPO_TIERS[tier];
  const progress = scoringBeatsRef.current
    ? Math.min(1, Math.max(0, (beatCursorRef.current - countInRef.current) / scoringBeatsRef.current))
    : 0;
  const hideGuide =
    (cfg.hideVisualGuide && runPhase === "independent") ||
    (runPhase === "independent" && !settings.showBeatFlash);
  const cue = settings.showTimingOffsets ? timingCue(live.lastDeviation) : null;

  return (
    <div className={cn(phase === "running" || phase === "paused" ? "min-h-dvh bg-bg px-4 py-6" : "mx-auto max-w-3xl")}>
      {phase === "setup" && header}
      {phase === "setup" && (
        <Card className="mb-6">
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-medium">Maintain the Tempo</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Count-in with metronome, then keep tapping in silence. Space, click, tap, or MIDI.
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
              <label className="text-[12px] text-muted">Target BPM</label>
              <Segmented
                label="BPM"
                value={bpm}
                onChange={setBpm}
                options={cfg.bpms.map((b) => ({ value: b, label: String(b) }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] text-muted">Subdivision</label>
              <Segmented
                label="Subdivision"
                value={subdivision}
                onChange={setSubdivision}
                options={cfg.subdivisions.map((s) => ({ value: s, label: SUBDIVISION_LABEL[s] }))}
              />
            </div>

            <p className="rounded-[10px] border border-line bg-elevated/40 px-3 py-2 text-[13px] text-muted">
              After the audible count-in, the click track stops. The timing engine keeps running — rely on your internal pulse.
              {cfg.hideVisualGuide ? " Visual beat flash also hides after count-in at this tier." : ""}
            </p>

            <Button variant="primary" size="lg" onClick={() => void start()}>
              <Play className="size-4" />
              Start · {SESSION_LENGTHS[settings.sessionLength].tempoBeats} beats
            </Button>
          </CardBody>
        </Card>
      )}

      {(phase === "running" || phase === "paused") && (
        <div className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center gap-8">
          <div className="flex w-full items-center justify-between text-[13px] text-muted">
            <span className="tabular">{bpm} BPM · {SUBDIVISION_LABEL[subdivision]}</span>
            <Badge tone={runPhase === "guided" ? "accent" : "warning"}>
              {runPhase === "guided" ? "Count-in" : "Independent · silent"}
            </Badge>
            <span className="tabular">{formatClock(elapsed)}</span>
          </div>

          <button
            type="button"
            aria-label="Tap the beat"
            onPointerDown={(e) => {
              e.preventDefault();
              registerTap(performance.now());
            }}
            className="relative flex size-48 items-center justify-center rounded-full border border-orange/30 bg-elevated shadow-[0_0_60px_-24px_var(--glow-orange)] outline-none sm:size-56"
          >
            <span
              className={cn(
                "absolute inset-3 rounded-full border-2 transition-opacity",
                hideGuide ? "opacity-20 border-line" : "border-orange/45",
                flash > 0 && !hideGuide && "opacity-100 border-orange bg-orange/20",
              )}
            />
            <span className="relative z-10 text-center">
              <span className="block tabular font-display text-[44px] font-semibold tracking-tight">{bpm}</span>
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-orange/80">BPM</span>
            </span>
          </button>

          <div className="w-full max-w-sm space-y-3">
            <ProgressBar value={progress} label="Session progress" />
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">
                Hits <span className="tabular text-fg">{live.hit}</span>
              </span>
              <span className={cn("font-medium", cue?.tone ?? (live.lastGrade ? GRADE_TONE[live.lastGrade] : "text-muted"))}>
                {cue?.label ?? (live.lastGrade ? live.lastGrade : runPhase === "guided" ? "Listen…" : "Keep going")}
                {settings.showTimingOffsets && live.lastDeviation != null && (
                  <span className="ml-1 tabular text-subtle">
                    ({live.lastDeviation > 0 ? "+" : ""}
                    {Math.round(live.lastDeviation)} ms)
                  </span>
                )}
              </span>
              <span className="text-muted">
                Acc <span className="tabular text-fg">{formatPercent(live.accuracy)}</span>
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {phase === "running" ? (
              <Button onClick={pause}>
                <Pause className="size-4" />
                Pause
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void resume()}>
                <Play className="size-4" />
                Resume
              </Button>
            )}
            <Button variant="ghost" onClick={stop}>
              <Square className="size-4" />
              End
            </Button>
          </div>
          <p className="text-center text-[12px] text-subtle">Space / Enter / click / tap / MIDI</p>
        </div>
      )}
    </div>
  );
}
