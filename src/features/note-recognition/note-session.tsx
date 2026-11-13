"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { MicMeter } from "@/components/audio/mic-meter";
import { PageHeader } from "@/components/training/page-header";
import { SessionResults } from "@/components/training/session-results";
import { Button } from "@/components/ui/button";
import { Badge, ProgressBar } from "@/components/ui/controls";
import { TierSelector } from "@/components/training/tier-selector";
import { Card, CardBody } from "@/components/ui/card";
import { resumeAudio } from "@/lib/audio/context";
import { INSTRUMENTS } from "@/lib/audio/instruments";
import { describeMicError, MicrophoneInput } from "@/lib/audio/microphone";
import { isMidiSupported, subscribeMidiNoteOn } from "@/lib/audio/midi";
import { PitchEngine } from "@/lib/audio/pitch-engine";
import { playFeedback, playTone } from "@/lib/audio/sounds";
import { midiToNote } from "@/lib/music/notes";
import { SESSION_LENGTHS } from "@/lib/store/defaults";
import { useAppStore, type RecordOutcome } from "@/lib/store";
import { evaluateNote, scoreNotes, tuningVerdict, type NoteTrial } from "@/lib/scoring/notes";
import { useFocusMode } from "@/hooks/training/use-focus-mode";
import { bestScoreForTier, highestUnlockedTier, TIER_NAMES, tierProgress } from "@/features/gamification/tiers";
import { resolveOpenMidi, STRING_LABELS } from "@/features/fretboard/engine/tuning";
import type { GuitarString } from "@/features/fretboard/types";
import { cn, formatMs, formatPercent, mean, pick, round } from "@/lib/utils";
import type { Tier } from "@/types";
import { CalibrationPanel } from "./calibration";
import { midisForTier, NOTE_TIERS } from "./config";
import {
  applyNoteRecall,
  ensureNoteMastery,
  formatMidiRange,
  lessonFor,
  pickTarget,
  type NoteLessonConfig,
} from "./progression";
import { StringProgressPanel } from "./string-progress";

type Phase = "calibrate" | "setup" | "running" | "results";
type Flash = "correct" | "wrong" | "sharp" | "flat" | "octave" | "missed" | "silent" | null;

export function NoteSession() {
  const settings = useAppStore((s) => s.settings);
  const sessions = useAppStore((s) => s.sessions);
  const recordSession = useAppStore((s) => s.recordSession);
  const setLastTier = useAppStore((s) => s.setLastTier);
  const noteStringMastery = useAppStore((s) => s.noteStringMastery);
  const setNoteStringMastery = useAppStore((s) => s.setNoteStringMastery);
  const unlocked = highestUnlockedTier(sessions, "notes");
  const lastTier = useAppStore((s) => s.lastTier.notes ?? 0);
  const progressInfo = tierProgress(sessions, "notes");
  const bestByTier = bestScoreForTier(sessions, "notes");

  const [tier, setTier] = useState<Tier>(Math.min(lastTier, unlocked) as Tier);
  const [phase, setPhase] = useState<Phase>(settings.noteInputSource === "midi" ? "setup" : "calibrate");
  const [targetMidi, setTargetMidi] = useState<number | null>(null);
  const [targetMeta, setTargetMeta] = useState<{ string: GuitarString; fret: number } | null>(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);
  const [level, setLevel] = useState(0);
  const [detected, setDetected] = useState<string | null>(null);
  const [live, setLive] = useState({ correct: 0, errors: 0, lastRt: null as number | null });
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  const engineRef = useRef<PitchEngine | null>(null);
  const midiUnsub = useRef<(() => void) | null>(null);
  const trialsRef = useRef<NoteTrial[]>([]);
  const promptAtRef = useRef(0);
  const acceptingRef = useRef(false);
  const targetRef = useRef<number | null>(null);
  const targetStringRef = useRef<GuitarString | null>(null);
  const indexRef = useRef(0);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const masteryRef = useRef(noteStringMastery);
  const totalTrials = SESSION_LENGTHS[settings.sessionLength].noteTrials;
  const startedAtIso = useRef("");
  const startPerf = useRef(0);

  const isGuitar = settings.instrument === "guitar";
  const openMidi = useMemo(
    () => resolveOpenMidi(settings.fretboard.tuningId, settings.fretboard.customOpenMidi),
    [settings.fretboard.customOpenMidi, settings.fretboard.tuningId],
  );

  const mastery = useMemo(() => ensureNoteMastery(noteStringMastery), [noteStringMastery]);
  masteryRef.current = mastery;

  const lesson: NoteLessonConfig | null = useMemo(
    () => (isGuitar ? lessonFor(tier, mastery, openMidi) : null),
    [isGuitar, mastery, openMidi, tier],
  );
  const pianoCfg = NOTE_TIERS[tier];

  useFocusMode(phase === "running");

  const clearTimers = () => {
    if (missTimer.current) clearTimeout(missTimer.current);
    if (gapTimer.current) clearTimeout(gapTimer.current);
    missTimer.current = null;
    gapTimer.current = null;
  };

  const disposeInput = () => {
    engineRef.current?.dispose();
    engineRef.current = null;
    midiUnsub.current?.();
    midiUnsub.current = null;
  };

  useEffect(() => () => {
    clearTimers();
    disposeInput();
  }, []);

  const showName = lesson?.showName ?? pianoCfg.showName;
  const playReference = lesson?.playReference ?? pianoCfg.playReference;
  const trialTimeoutMs = lesson?.trialTimeoutMs ?? pianoCfg.trialTimeoutMs;
  const anyOctave = false;

  const finish = useCallback(() => {
    clearTimers();
    acceptingRef.current = false;
    disposeInput();
    const trials = trialsRef.current;
    const scored = scoreNotes(trials);
    const correct = trials.filter((t) => t.outcome === "correct");
    const rts = correct.map((t) => t.reactionMs!).filter(Boolean);
    const rangeLabel = lesson
      ? formatMidiRange(lesson.midiMin, lesson.midiMax)
      : `${pianoCfg.from}–${pianoCfg.to}`;
    const result = recordSession({
      exercise: "notes",
      category: "notes",
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
        earOnly: showName ? 0 : 1,
        avgCents: correct.length ? mean(correct.map((t) => Math.abs(t.cents ?? 0))) : 0,
        missed: trials.filter((t) => t.outcome === "missed").length,
        guitarProgression: isGuitar ? 1 : 0,
        maxFret: lesson?.maxFret ?? 0,
        stringCount: lesson?.strings.length ?? 0,
      },
      configLabel: `${TIER_NAMES[tier]} · ${rangeLabel} · ${settings.noteInputSource}`,
      perfect: trials.length > 0 && correct.length === trials.length,
    });
    setLastTier("notes", tier);
    setNoteStringMastery(masteryRef.current);
    setOutcome(result);
    setPhase("results");
    setTargetMidi(null);
    setTargetMeta(null);
  }, [
    isGuitar,
    lesson,
    pianoCfg.from,
    pianoCfg.to,
    recordSession,
    setLastTier,
    setNoteStringMastery,
    settings.noteInputSource,
    showName,
    tier,
  ]);

  const queueNextRef = useRef<() => void>(() => {});
  const handleDetectionRef = useRef<(midi: number, cents: number, onsetTime: number) => void>(() => {});

  const queueNext = useCallback(() => {
    const nextIndex = indexRef.current;
    if (nextIndex >= totalTrials) {
      finish();
      return;
    }
    acceptingRef.current = false;
    setTargetMidi(null);
    setTargetMeta(null);
    targetRef.current = null;
    targetStringRef.current = null;
    setFlash(null);
    setDetected(null);
    gapTimer.current = setTimeout(async () => {
      let next: number;
      let meta: { string: GuitarString; fret: number } | null = null;
      if (isGuitar) {
        const currentLesson = lessonFor(tier, masteryRef.current, openMidi);
        const picked = pickTarget(openMidi, currentLesson, masteryRef.current, targetRef.current);
        next = picked.midi;
        meta = { string: picked.string, fret: picked.fret };
        targetStringRef.current = picked.string;
      } else {
        const pool = midisForTier(tier);
        next = pick(pool);
        if (pool.length > 1 && next === targetRef.current) next = pick(pool.filter((n) => n !== next));
      }
      targetRef.current = next;
      setTargetMidi(next);
      setTargetMeta(meta);
      setTrialIndex(nextIndex);
      promptAtRef.current = performance.now();
      engineRef.current?.resetTracking();
      acceptingRef.current = true;

      if (playReference) {
        await resumeAudio();
        playTone(next, (await resumeAudio()).currentTime + 0.02, 0.55, settings.masterVolume * 0.55);
      }

      missTimer.current = setTimeout(() => {
        if (!acceptingRef.current) return;
        acceptingRef.current = false;
        trialsRef.current.push({
          targetMidi: next,
          detectedMidi: null,
          cents: null,
          outcome: "missed",
          reactionMs: null,
        });
        if (isGuitar && targetStringRef.current != null) {
          masteryRef.current = applyNoteRecall(masteryRef.current, targetStringRef.current, false, null, null);
          setNoteStringMastery(masteryRef.current);
        }
        setFlash(engineRef.current?.latest?.voiced ? "missed" : "silent");
        setLive((l) => ({ ...l, errors: l.errors + 1 }));
        if (settings.feedbackSounds) playFeedback("error", settings.masterVolume * 0.4);
        indexRef.current = nextIndex + 1;
        queueNext();
      }, trialTimeoutMs);
    }, 500);
  }, [
    finish,
    isGuitar,
    openMidi,
    playReference,
    setNoteStringMastery,
    settings.feedbackSounds,
    settings.masterVolume,
    tier,
    totalTrials,
    trialTimeoutMs,
  ]);

  queueNextRef.current = queueNext;
  handleDetectionRef.current = (midi, cents, onset) => {
    if (!acceptingRef.current || targetRef.current == null) return;
    acceptingRef.current = false;
    clearTimers();
    const target = targetRef.current;
    const outcome = evaluateNote(target, midi, anyOctave);
    const rt = Math.max(0, onset - promptAtRef.current);
    trialsRef.current.push({ targetMidi: target, detectedMidi: midi, cents, outcome, reactionMs: rt });

    if (isGuitar && targetStringRef.current != null) {
      masteryRef.current = applyNoteRecall(
        masteryRef.current,
        targetStringRef.current,
        outcome === "correct",
        outcome === "correct" ? rt : null,
        outcome === "correct" ? Math.abs(cents) : null,
      );
      setNoteStringMastery(masteryRef.current);
    }

    let flashKind: Flash = "wrong";
    if (outcome === "correct") {
      const verdict = tuningVerdict(cents);
      flashKind = verdict === "in-tune" ? "correct" : verdict;
    } else if (outcome === "octave") flashKind = "octave";
    setFlash(flashKind);
    setDetected(midiToNote(midi).name);
    setLive((l) => ({
      correct: l.correct + (outcome === "correct" ? 1 : 0),
      errors: l.errors + (outcome === "correct" ? 0 : 1),
      lastRt: outcome === "correct" ? rt : l.lastRt,
    }));
    if (settings.feedbackSounds) playFeedback(outcome === "correct" ? "success" : "error", settings.masterVolume * 0.5);
    indexRef.current += 1;
    queueNextRef.current();
  };

  const startEngine = async () => {
    setEngineError(null);
    disposeInput();
    await resumeAudio();
    if (settings.noteInputSource === "midi") {
      if (!isMidiSupported()) {
        setEngineError("Web MIDI is not supported in this browser. Switch to microphone in Settings.");
        return false;
      }
      try {
        midiUnsub.current = await subscribeMidiNoteOn((note, _vel, timeStamp) => {
          handleDetectionRef.current(note, 0, timeStamp || performance.now());
        });
        return true;
      } catch {
        setEngineError("Could not open MIDI access. Allow MIDI permissions or use the microphone.");
        return false;
      }
    }

    try {
      const profile = INSTRUMENTS[settings.instrument];
      const mic = await MicrophoneInput.open(profile, settings.audioInputDeviceId || undefined);
      const engine = new PitchEngine(mic, profile, settings.noiseGate);
      engineRef.current = engine;
      engine.onFrame((frame) => {
        setLevel(frame.rms);
        if (frame.midi != null) setDetected(midiToNote(frame.midi).name);
      });
      engine.onStableNote((note) => {
        handleDetectionRef.current(note.midi, note.cents, note.onsetTime);
      });
      engine.start();
      return true;
    } catch (err) {
      setEngineError(describeMicError(err));
      return false;
    }
  };

  const begin = async () => {
    const ok = await startEngine();
    if (!ok) return;
    trialsRef.current = [];
    indexRef.current = 0;
    masteryRef.current = ensureNoteMastery(noteStringMastery);
    setLive({ correct: 0, errors: 0, lastRt: null });
    setOutcome(null);
    startedAtIso.current = new Date().toISOString();
    startPerf.current = performance.now();
    setLastTier("notes", tier);
    setPhase("running");
    queueNext();
  };

  if (phase === "results" && outcome) {
    return (
      <SessionResults
        outcome={outcome}
        onRetry={() => setPhase(settings.noteInputSource === "midi" ? "setup" : "calibrate")}
        dashboardHref="/notes"
      />
    );
  }

  if (phase === "calibrate") {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Notes · Pitch"
          title="Note Recognition"
          description="Connect what you hear to what you play — with cents-accurate, octave-aware feedback."
        />
        <CalibrationPanel onReady={() => setPhase("setup")} />
      </div>
    );
  }

  const progress = totalTrials ? trialIndex / totalTrials : 0;
  const targetName = targetMidi != null ? midiToNote(targetMidi).name : null;

  return (
    <div className={phase === "setup" ? "mx-auto max-w-3xl" : undefined}>
      {phase === "setup" && (
        <>
          <PageHeader
            eyebrow="Notes · Pitch"
            title="Note Recognition"
            description={
              isGuitar
                ? "Progressive string training from low E through the full fretboard — exact octave required."
                : "Connect what you hear to what you play — with cents-accurate feedback."
            }
          />
          <Card className="mb-6">
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-medium">Note Recognition</h2>
                  <p className="mt-1 text-[13px] text-muted">
                    {isGuitar
                      ? "Master one string at a time, expand octaves, then mix strings. Wrong octave never counts as correct."
                      : "Hear or see a target note, then play it. Detection uses a YIN pitch tracker — monophonic notes only."}
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

              {isGuitar && lesson && (
                <>
                  <div className="rounded-[12px] border border-line bg-elevated/40 px-4 py-3">
                    <div className="text-[12px] uppercase tracking-[0.12em] text-subtle">Current training</div>
                    <div className="mt-1 text-[15px] font-medium">{lesson.stageLabel}</div>
                    <p className="mt-1 text-[13px] text-muted">{lesson.stageDetail}</p>
                    <p className="mt-2 text-[13px] text-fg">
                      Range{" "}
                      <span className="tabular font-medium">{formatMidiRange(lesson.midiMin, lesson.midiMax)}</span>
                      {" · "}frets 0–{lesson.maxFret}
                      {lesson.focusString != null && (
                        <>
                          {" · "}String {lesson.focusString} ({STRING_LABELS[lesson.focusString]})
                        </>
                      )}
                    </p>
                  </div>
                  <StringProgressPanel
                    mastery={mastery}
                    activeStrings={lesson.strings}
                    focusString={lesson.focusString}
                  />
                </>
              )}

              {!isGuitar && (
                <ul className="space-y-1.5 text-[13px] text-muted">
                  <li>
                    Range:{" "}
                    <span className="text-fg">
                      {pianoCfg.from}–{pianoCfg.to}
                    </span>
                    {pianoCfg.naturalsOnly ? " · naturals" : " · chromatic"}
                  </li>
                  <li>
                    Prompt: {pianoCfg.showName ? "note name shown" : "ear only (name hidden)"}
                    {pianoCfg.playReference ? " · reference tone plays" : " · no reference tone"}
                  </li>
                </ul>
              )}

              <ul className="space-y-1.5 text-[13px] text-muted">
                <li>
                  Input: <span className="text-fg">{settings.noteInputSource}</span> ·{" "}
                  {INSTRUMENTS[settings.instrument].name}
                  {isGuitar && <> · tuning from Fretboard settings</>}
                </li>
                <li>Octave must match — pitch class alone is not enough.</li>
              </ul>

              {engineError && <p className="text-[13px] text-error">{engineError}</p>}

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="lg" onClick={() => void begin()}>
                  <Play className="size-4" />
                  Start · {totalTrials} notes
                </Button>
                {settings.noteInputSource === "microphone" && (
                  <Button variant="ghost" onClick={() => setPhase("calibrate")}>
                    Recalibrate mic
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {phase === "running" && (
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-8">
          <div className="flex w-full items-center justify-between text-[13px] text-muted">
            <span>
              Note <span className="tabular text-fg">{Math.min(trialIndex + 1, totalTrials)}</span> / {totalTrials}
            </span>
            <span className="tabular">
              {live.correct} correct · {formatPercent(trialIndex ? live.correct / Math.max(trialIndex, 1) : 0)}
            </span>
          </div>
          <ProgressBar value={progress} label="Session progress" className="w-full" />

          {isGuitar && targetMeta && showName && tier === 0 && (
            <p className="text-[12px] text-muted">
              Hint position: string {targetMeta.string} ({STRING_LABELS[targetMeta.string]}), fret {targetMeta.fret}
            </p>
          )}

          <div className="flex size-44 flex-col items-center justify-center rounded-full border border-line-strong bg-elevated sm:size-52">
            <span className="text-[12px] uppercase tracking-[0.12em] text-muted">Play</span>
            <span className="mt-1 tabular text-[48px] font-semibold tracking-tight">
              {showName ? targetName ?? "…" : "♪"}
            </span>
            {!showName && <span className="mt-1 text-[12px] text-subtle">Ear only</span>}
          </div>

          {settings.noteInputSource === "microphone" && (
            <div className="w-full max-w-sm space-y-2">
              <MicMeter level={level} peak={level} gate={settings.noiseGate} />
              <p className="text-center text-[12px] text-muted">
                Hearing: <span className="tabular text-fg">{detected ?? "—"}</span>
              </p>
            </div>
          )}

          {flash && (
            <p
              className={cn(
                "text-[15px] font-medium",
                flash === "correct" && "text-success",
                (flash === "sharp" || flash === "flat") && "text-warning",
                (flash === "wrong" || flash === "octave" || flash === "missed" || flash === "silent") && "text-error",
              )}
            >
              {flash === "correct" && `Correct · ${formatMs(live.lastRt)}`}
              {flash === "sharp" && "Slightly sharp — accepted"}
              {flash === "flat" && "Slightly flat — accepted"}
              {flash === "wrong" && `Incorrect${detected ? ` (${detected})` : ""}`}
              {flash === "octave" && "Right pitch class, wrong octave"}
              {flash === "missed" && "Time’s up"}
              {flash === "silent" && "No sound detected"}
            </p>
          )}

          <Button variant="ghost" onClick={finish}>
            <Square className="size-4" />
            End session
          </Button>
          {targetMidi != null && showName && (
            <p className="text-[12px] text-subtle">Target {round(midiToNote(targetMidi).frequency, 1)} Hz</p>
          )}
        </div>
      )}
    </div>
  );
}
