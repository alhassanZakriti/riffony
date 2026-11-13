"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, Lock, Play, SkipForward, Square } from "lucide-react";
import { PageHeader } from "@/components/training/page-header";
import { SessionResults } from "@/components/training/session-results";
import { Button } from "@/components/ui/button";
import { Badge, ProgressBar } from "@/components/ui/controls";
import { toast } from "@/components/ui/toast";
import { Segmented } from "@/components/ui/segmented";
import { Card, CardBody } from "@/components/ui/card";
import { resumeAudio } from "@/lib/audio/context";
import { INSTRUMENTS } from "@/lib/audio/instruments";
import { describeMicError, MicrophoneInput } from "@/lib/audio/microphone";
import { PitchEngine } from "@/lib/audio/pitch-engine";
import { playFeedback, playTone } from "@/lib/audio/sounds";
import { scoreFretboard } from "@/lib/scoring/fretboard";
import { SESSION_LENGTHS } from "@/lib/store/defaults";
import { useAppStore, type RecordOutcome } from "@/lib/store";
import { useFocusMode } from "@/hooks/training/use-focus-mode";
import { cn, formatClock, formatPercent, mean } from "@/lib/utils";
import type { Tier } from "@/types";
import { GuitarFretboard, highlightsFromPositions, type FretHighlight } from "./components/guitar-fretboard";
import { FretboardHeatmap } from "./components/fretboard-heatmap";
import {
  validateFind,
  validateFindAll,
  validateIdentify,
  validateOctave,
} from "./engine/answer-validator";
import { highestUnlockedStage, STAGES, stageProgress } from "./engine/curriculum";
import { defaultStageForMode, generateQuestion } from "./engine/exercise-generator";
import { applyRecalls, countMastered, weakestStrings } from "./engine/mastery";
import { noteAt, positionsEqual } from "./engine/note-calculator";
import { resolveOpenMidi, STRING_LABELS } from "./engine/tuning";
import type { CurriculumStage, FretboardMode, FretboardQuestion, FretPosition, GuitarString } from "./types";
import { positionKey } from "./types";

type Phase = "setup" | "running" | "feedback" | "results";

function skipTargets(q: FretboardQuestion): { masteryPositions: FretPosition[]; revealed: FretPosition[] } {
  switch (q.kind) {
    case "identify":
    case "challenge-identify":
    case "play":
      return { masteryPositions: [q.target], revealed: [q.target] };
    case "octave":
    case "challenge-octave":
      return { masteryPositions: [q.reference], revealed: [q.reference, ...q.valid] };
    case "find":
    case "challenge-find":
    case "find-all":
      return { masteryPositions: q.valid.slice(0, 1), revealed: q.valid };
  }
}

const MODE_LABEL: Record<FretboardMode, string> = {
  identify: "Identify",
  find: "Find note",
  "find-all": "Find all",
  octave: "Octaves",
  challenge: "Challenge",
  play: "Play guitar",
};

const MODE_STAT: Record<FretboardMode, number> = {
  identify: 0,
  find: 1,
  "find-all": 2,
  octave: 3,
  challenge: 4,
  play: 5,
};

export function FretboardSession({ weakOnly = false }: { weakOnly?: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const mastery = useAppStore((s) => s.fretboardMastery);
  const setMastery = useAppStore((s) => s.setFretboardMastery);
  const recordSession = useAppStore((s) => s.recordSession);
  const setLastTier = useAppStore((s) => s.setLastTier);

  const fb = settings.fretboard;
  const openMidi = useMemo(
    () => resolveOpenMidi(fb.tuningId, fb.customOpenMidi),
    [fb.tuningId, fb.customOpenMidi],
  );
  const unlockedStage = highestUnlockedStage(mastery);

  const [stage, setStage] = useState<CurriculumStage>(unlockedStage);
  const [mode, setMode] = useState<FretboardMode>("identify");
  const [phase, setPhase] = useState<Phase>("setup");
  const [question, setQuestion] = useState<FretboardQuestion | null>(null);
  const [selected, setSelected] = useState<FretPosition[]>([]);
  const [highlights, setHighlights] = useState<Partial<Record<string, FretHighlight>>>({});
  const [feedback, setFeedback] = useState<{ correct: boolean; detail: string } | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [index, setIndex] = useState(0);
  const [live, setLive] = useState({ correct: 0, errors: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);
  const [showNames, setShowNames] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const trialsRef = useRef<{ correct: boolean; reactionMs: number | null; usedHint: boolean; positions: FretPosition[] }[]>([]);
  const masteryRef = useRef(mastery);
  const promptAt = useRef(0);
  const recentKeys = useRef<string[]>([]);
  const startedAtIso = useRef("");
  const startPerf = useRef(0);
  const engineRef = useRef<PitchEngine | null>(null);
  const totalTrials = SESSION_LENGTHS[settings.sessionLength].fretboardTrials;
  const stageDef = STAGES[stage - 1];

  useFocusMode(phase === "running" || phase === "feedback");
  useEffect(() => {
    masteryRef.current = mastery;
  }, [mastery]);

  useEffect(() => {
    if (stage > unlockedStage) setStage(unlockedStage);
  }, [unlockedStage, stage]);

  useEffect(() => {
    if (!stageDef.modes.includes(mode)) setMode(stageDef.modes[0]);
  }, [stageDef, mode]);

  const disposeMic = () => {
    engineRef.current?.dispose();
    engineRef.current = null;
  };

  useEffect(() => () => disposeMic(), []);

  const paintQuestion = useCallback((q: FretboardQuestion) => {
    if (q.kind === "identify" || q.kind === "challenge-identify" || q.kind === "play") {
      setHighlights(highlightsFromPositions([q.target], "prompt"));
    } else if (q.kind === "octave" || q.kind === "challenge-octave") {
      setHighlights(highlightsFromPositions([q.reference], "reference"));
    } else {
      setHighlights({});
    }
  }, []);

  const finishRef = useRef<(map: typeof mastery) => void>(() => {});

  const nextQuestion = useCallback(
    (masteryMap: typeof mastery, trialIndex: number) => {
      if (trialIndex >= totalTrials) {
        finishRef.current(masteryMap);
        return;
      }
      const ctxStage = defaultStageForMode(mode, stage);
      let enabled = fb.enabledStrings.filter((s) => ctxStage.strings.includes(s as GuitarString)) as GuitarString[];
      if (weakOnly) {
        const weak = weakestStrings(masteryMap).filter((w) => w.samples > 0).slice(0, 2).map((w) => w.string as GuitarString);
        if (weak.length) enabled = enabled.filter((s) => weak.includes(s));
      }
      const q = generateQuestion({
        openMidi,
        preference: fb.accidentalPreference,
        stage: ctxStage,
        mode,
        mastery: masteryMap,
        enabledStrings: enabled.length ? enabled : (ctxStage.strings as GuitarString[]),
        minFret: fb.minFret,
        maxFret: Math.min(fb.maxFret, fb.fretCount),
        recentKeys: recentKeys.current,
      });
      setQuestion(q);
      setSelected([]);
      setFeedback(null);
      setUsedHint(false);
      setIndex(trialIndex);
      promptAt.current = performance.now();
      paintQuestion(q);
      setPhase("running");

      if (q.kind === "play") {
        void ensureMic().then((ok) => {
          if (!ok) return;
          engineRef.current?.resetTracking();
        });
      }
    },
    // finish/ensureMic defined below — kept stable via refs pattern for session flow
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fb, mode, openMidi, paintQuestion, stage, totalTrials, weakOnly],
  );

  const nextQuestionRef = useRef(nextQuestion);
  nextQuestionRef.current = nextQuestion;

  const finish = (masteryMap: typeof mastery) => {
    disposeMic();
    const trials = trialsRef.current;
    const scored = scoreFretboard(trials);
    const correct = trials.filter((t) => t.correct);
    const rts = correct.map((t) => t.reactionMs!).filter((n) => n != null);
    const strings = new Set(trials.flatMap((t) => t.positions.map((p) => p.string)));
    const openCorrect = trials.filter(
      (t) => t.correct && t.positions.some((p) => p.fret === 0),
    ).length;
    const weak = weakestStrings(masteryMap).find((w) => w.samples > 0);
    const progress = stageProgress(masteryMap, stage);
    const result = recordSession({
      exercise: "fretboard",
      category: "fretboard",
      tier: Math.min(3, Math.max(0, stage - 1)) as Tier,
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
        mode: MODE_STAT[mode],
        stage,
        mastered: countMastered(masteryMap),
        stageMastered: progress.mastered,
        stringsTouched: strings.size,
        openStringCorrect: openCorrect,
        weakestString: weak?.string ?? 0,
        hints: trials.filter((t) => t.usedHint).length,
      },
      configLabel: `${MODE_LABEL[mode]} · Stage ${stage} · ${STAGES[stage - 1].title}`,
      perfect: trials.length > 0 && correct.length === trials.length && trials.every((t) => !t.usedHint),
    });
    setLastTier("fretboard", Math.min(3, Math.max(0, stage - 1)) as Tier);
    setMastery(masteryMap);
    setOutcome(result);
    setPhase("results");
    setQuestion(null);
  };
  finishRef.current = finish;

  const ensureMic = async () => {
    setMicError(null);
    if (engineRef.current) return true;
    try {
      await resumeAudio();
      const mic = await MicrophoneInput.open(INSTRUMENTS.guitar, settings.audioInputDeviceId || undefined);
      const engine = new PitchEngine(mic, INSTRUMENTS.guitar, settings.noiseGate);
      engineRef.current = engine;
      engine.onStableNote((note) => {
        const q = questionRef.current;
        if (!q || q.kind !== "play" || phaseRef.current !== "running") return;
        const targetMidi = q.targetMidi;
        const sameClass = ((note.midi % 12) + 12) % 12 === ((targetMidi % 12) + 12) % 12;
        const exact = note.midi === targetMidi;
        settleAnswer(exact || sameClass, exact
          ? "Correct pitch."
          : sameClass
            ? "Right pitch class, different octave — accepted for this drill."
            : `Heard a different pitch. Target was ${q.noteName}.`, [q.target]);
      });
      engine.start();
      return true;
    } catch (err) {
      setMicError(describeMicError(err));
      return false;
    }
  };

  const questionRef = useRef(question);
  const phaseRef = useRef(phase);
  questionRef.current = question;
  phaseRef.current = phase;

  const settleAnswer = (correct: boolean, detail: string, masteryPositions: FretPosition[], revealed: FretPosition[] = masteryPositions) => {
    if (phaseRef.current !== "running") return;
    const rt = performance.now() - promptAt.current;
    const hint = usedHint;
    trialsRef.current.push({ correct, reactionMs: rt, usedHint: hint, positions: masteryPositions });
    const nextMap = applyRecalls(masteryRef.current, masteryPositions, correct && !hint, hint ? null : rt);
    // Hints still update attempts lightly as incorrect-leaning learning signal when wrong;
    // when correct with hint, apply with reduced benefit by treating as correct but we already pass correct.
    masteryRef.current = nextMap;
    setMastery(nextMap);

    for (const p of masteryPositions) recentKeys.current = [...recentKeys.current.slice(-8), positionKey(p)];

    let hl: Partial<Record<string, FretHighlight>> = {};
    if (correct) hl = highlightsFromPositions(revealed, "correct");
    else {
      hl = highlightsFromPositions(revealed, "correct");
      for (const p of selected) {
        if (!revealed.some((r) => positionsEqual(r, p))) hl[positionKey(p)] = "incorrect";
      }
    }
    setHighlights(hl);
    setFeedback({ correct, detail });
    setLive((l) => ({ correct: l.correct + (correct ? 1 : 0), errors: l.errors + (correct ? 0 : 1) }));
    if (settings.feedbackSounds) {
      void resumeAudio().then(() => playFeedback(correct ? "success" : "error", settings.masterVolume * 0.5));
    }
    setPhase("feedback");
  };

  const begin = async () => {
    if (settings.feedbackSounds) await resumeAudio();
    trialsRef.current = [];
    recentKeys.current = [];
    masteryRef.current = mastery;
    setLive({ correct: 0, errors: 0 });
    setOutcome(null);
    setElapsed(0);
    startedAtIso.current = new Date().toISOString();
    startPerf.current = performance.now();
    nextQuestionRef.current(mastery, 0);
  };

  useEffect(() => {
    if (phase !== "running" && phase !== "feedback") return;
    const id = setInterval(() => setElapsed(performance.now() - startPerf.current), 250);
    return () => clearInterval(id);
  }, [phase]);

  const onFretClick = (pos: FretPosition) => {
    if (phase !== "running" || !question) return;
    const q = question;

    if (q.kind === "identify" || q.kind === "challenge-identify" || q.kind === "play") {
      // Clicking the prompted fret plays a reference tone (study aid), not an answer.
      void resumeAudio().then((ctx) => {
        const n = noteAt(pos, openMidi, fb.accidentalPreference);
        playTone(n.midi, ctx.currentTime + 0.01, 0.4, settings.masterVolume * 0.45);
      });
      return;
    }

    if (q.kind === "find" || q.kind === "challenge-find") {
      const next = [pos];
      setSelected(next);
      setHighlights(highlightsFromPositions(next, "selected"));
      const result = validateFind(q, next);
      settleAnswer(result.correct, result.detail, result.masteryPositions, result.revealed);
      return;
    }

    if (q.kind === "octave" || q.kind === "challenge-octave") {
      setSelected([pos]);
      const result = validateOctave(q, pos);
      settleAnswer(result.correct, result.detail, result.masteryPositions, result.revealed);
      return;
    }

    if (q.kind === "find-all") {
      const exists = selected.some((p) => positionsEqual(p, pos));
      const next = exists ? selected.filter((p) => !positionsEqual(p, pos)) : [...selected, pos];
      setSelected(next);
      setHighlights(highlightsFromPositions(next, "selected"));
    }
  };

  const submitFindAll = () => {
    if (!question || question.kind !== "find-all") return;
    const result = validateFindAll(question, selected);
    settleAnswer(result.correct, result.detail, result.masteryPositions, result.revealed);
  };

  const submitIdentify = (name: string) => {
    if (!question || (question.kind !== "identify" && question.kind !== "challenge-identify")) return;
    const result = validateIdentify(question, name);
    settleAnswer(result.correct, result.detail, result.masteryPositions, result.revealed);
  };

  const useHint = () => {
    if (!question || usedHint || phase !== "running") return;
    setUsedHint(true);
    if (question.kind === "identify" || question.kind === "challenge-identify") {
      // Reveal string label only — not the note name.
      setFeedback({ correct: false, detail: `Hint: focus on the ${STRING_LABELS[question.target.string]} string open reference.` });
    } else if (question.kind === "find" || question.kind === "challenge-find") {
      const hintPos = question.valid[0];
      if (hintPos) setHighlights((h) => ({ ...h, [positionKey(hintPos)]: "hint" }));
    } else if (question.kind === "octave" || question.kind === "challenge-octave") {
      setFeedback({ correct: false, detail: `Hint: ${question.explanation}` });
    } else if (question.kind === "find-all") {
      const missing = question.valid.find((p) => !selected.some((s) => positionsEqual(s, p)));
      if (missing) setHighlights((h) => ({ ...h, [positionKey(missing)]: "hint" }));
    }
  };

  const continueAfterFeedback = () => {
    nextQuestionRef.current(masteryRef.current, index + 1);
  };

  if (phase === "results" && outcome) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <SessionResults outcome={outcome} onRetry={() => setPhase("setup")} dashboardHref="/fretboard" />
        <Card>
          <CardBody className="space-y-3">
            <h2 className="text-[14px] font-medium">Fretboard heatmap</h2>
            <FretboardHeatmap
              openMidi={openMidi}
              mastery={mastery}
              fretCount={fb.fretCount}
              preference={fb.accidentalPreference}
              handedness={fb.handedness}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setPhase("setup");
              }}
            >
              Back to setup
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className={phase === "setup" ? "mx-auto max-w-5xl" : "mx-auto max-w-5xl px-4 py-6"}>
      {phase === "setup" && (
        <>
          <PageHeader
            eyebrow="Fretboard · Mastery"
            title="Learn Fretboard"
            description="Active recall and spaced practice until note positions feel automatic."
          />
          <Card className="mb-6">
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-medium">Guitar Note Mastery</h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Stage {stage}: {stageDef.title}. Unlock later stages by mastering current positions — not by time spent.
                  </p>
                </div>
                <Badge tone="accent">{countMastered(mastery)} mastered</Badge>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] text-muted">Learning stage</label>
                <div role="radiogroup" aria-label="Stage" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STAGES.map((s) => {
                    const locked = s.stage > unlockedStage;
                    const selected = s.stage === stage;
                    const prog = stageProgress(mastery, s.stage);
                    return (
                      <button
                        key={s.stage}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          if (locked) {
                            toast(`Master ~70% of Stage ${s.stage - 1} positions (with repeated success) to unlock ${s.title}.`);
                            return;
                          }
                          setStage(s.stage);
                        }}
                        className={cn(
                          "rounded-[10px] border px-3 py-2.5 text-left transition-colors",
                          selected && !locked && "border-accent bg-accent/10",
                          !selected && !locked && "border-line hover:border-line-strong",
                          locked && "cursor-not-allowed border-line opacity-70",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium">Stage {s.stage}</span>
                          {locked && <Lock className="size-3.5 text-subtle" />}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">{s.title}</div>
                        {!locked && (
                          <div className="mt-1 text-[11px] text-subtle">
                            {prog.mastered}/{prog.total} mastered
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] text-muted">Mode</label>
                <Segmented
                  label="Mode"
                  value={mode}
                  onChange={setMode}
                  options={stageDef.modes.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
                />
              </div>

              <GuitarFretboard
                openMidi={openMidi}
                fretCount={fb.fretCount}
                preference={fb.accidentalPreference}
                handedness={fb.handedness}
                showNoteNames={showNames}
                interactive
                onSelect={(pos) => {
                  void resumeAudio().then((ctx) => {
                    const n = noteAt(pos, openMidi, fb.accidentalPreference);
                    playTone(n.midi, ctx.currentTime + 0.01, 0.45, settings.masterVolume * 0.5);
                  });
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowNames((v) => !v)}>
                  {showNames ? "Hide note names" : "Show note names"}
                </Button>
              </div>

              {micError && <p className="text-[13px] text-error">{micError}</p>}

              <Button variant="primary" size="lg" onClick={() => void begin()}>
                <Play className="size-4" />
                Start · {totalTrials} questions
              </Button>
            </CardBody>
          </Card>
        </>
      )}

      {(phase === "running" || phase === "feedback") && question && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
            <span>
              {MODE_LABEL[mode]} · Stage {stage}
            </span>
            <span className="tabular">{formatClock(elapsed)}</span>
            <span className="tabular">
              {live.correct}/{index + (phase === "feedback" ? 1 : 0)} correct ·{" "}
              {formatPercent(index || phase === "feedback" ? live.correct / Math.max(index + (phase === "feedback" ? 1 : 0), 1) : 0)}
            </span>
          </div>
          <ProgressBar value={(index + (phase === "feedback" ? 1 : 0)) / totalTrials} label="Session progress" />

          <div className="text-center">
            <p className="text-[12px] uppercase tracking-[0.1em] text-muted">Question {index + 1}</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[26px]">{question.prompt}</h2>
            {feedback && (
              <p className={cn("mt-2 text-[14px] font-medium", feedback.correct ? "text-success" : phase === "feedback" ? "text-error" : "text-warning")}>
                {feedback.detail}
              </p>
            )}
          </div>

          <GuitarFretboard
            openMidi={openMidi}
            fretCount={fb.fretCount}
            preference={fb.accidentalPreference}
            handedness={fb.handedness}
            showNoteNames={false}
            revealAnswerLabels={phase === "feedback"}
            interactive={phase === "running"}
            highlights={highlights}
            onSelect={onFretClick}
          />

          {(question.kind === "identify" || question.kind === "challenge-identify") && phase === "running" && (
            <div className="flex flex-wrap justify-center gap-2">
              {question.choices.map((c) => (
                <Button key={c} variant="secondary" size="lg" className="min-w-14" onClick={() => submitIdentify(c)}>
                  {c}
                </Button>
              ))}
            </div>
          )}

          {question.kind === "find-all" && phase === "running" && (
            <div className="flex justify-center gap-2">
              <Button variant="primary" onClick={submitFindAll} disabled={selected.length === 0}>
                Submit selections ({selected.length})
              </Button>
            </div>
          )}

          {question.kind === "play" && phase === "running" && (
            <p className="text-center text-[13px] text-muted">Listening for your guitar… pitch only — not the exact fret.</p>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {phase === "running" && (
              <>
                <Button variant="ghost" onClick={useHint} disabled={usedHint}>
                  <HelpCircle className="size-4" />
                  Hint
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const { masteryPositions, revealed } = skipTargets(question);
                    settleAnswer(false, "Skipped.", masteryPositions, revealed);
                  }}
                >
                  <SkipForward className="size-4" />
                  Skip
                </Button>
              </>
            )}
            {phase === "feedback" && (
              <Button variant="primary" onClick={continueAfterFeedback}>
                {index + 1 >= totalTrials ? "See results" : "Next"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => finish(masteryRef.current)}>
              <Square className="size-4" />
              End
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
