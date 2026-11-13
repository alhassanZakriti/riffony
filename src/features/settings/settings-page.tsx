"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/training/page-header";
import { Button } from "@/components/ui/button";
import { Field, Kbd, Select, Skeleton, Slider, Switch } from "@/components/ui/controls";
import { Segmented } from "@/components/ui/segmented";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { ALL_FINGERS, fingerDisplay } from "@/features/finger-training/fingers";
import { INSTRUMENTS } from "@/lib/audio/instruments";
import { listAudioInputs } from "@/lib/audio/microphone";
import { playClick, playFeedback } from "@/lib/audio/sounds";
import { resumeAudio } from "@/lib/audio/context";
import { TUNINGS } from "@/features/fretboard/engine/tuning";
import { DEFAULT_FRETBOARD, DEFAULT_KEY_MAPPING, DEFAULT_SETTINGS, SESSION_LENGTHS } from "@/lib/store/defaults";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { keyLabel } from "@/lib/utils";
import type {
  AccidentalPreference,
  FingerId,
  FretboardHandedness,
  InstrumentId,
  MetronomeSound,
  NoteInputSource,
  SessionLength,
  ThemePreference,
  TuningId,
} from "@/types";

export function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateFretboardSettings = useAppStore((s) => s.updateFretboardSettings);
  const resetProgress = useAppStore((s) => s.resetProgress);
  const restoreSnapshot = useAppStore((s) => s.restoreSnapshot);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [listeningFor, setListeningFor] = useState<FingerId | null>(null);

  useEffect(() => {
    void listAudioInputs().then(setDevices).catch(() => {});
  }, [settings.audioInputDeviceId]);

  useEffect(() => {
    if (!listeningFor) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      updateSettings({
        keyMapping: { ...settings.keyMapping, [listeningFor]: e.code },
      });
      setListeningFor(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listeningFor, settings.keyMapping, updateSettings]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Audio, difficulty defaults, keyboard mapping, and appearance. Progress is stored on this device."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Profile" description="Optional display name for the overview greeting." />
          <CardBody className="pt-0">
            <Field label="Display name">
              <input
                className="h-9 w-56 rounded-[10px] border border-line bg-bg px-3 text-[13px] text-fg outline-none focus-visible:border-accent"
                value={settings.displayName}
                placeholder="Musician"
                onChange={(e) => updateSettings({ displayName: e.target.value.slice(0, 40) })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sound" />
          <CardBody className="divide-y divide-line pt-0">
            <Field label="Master volume" description="Applies to metronome, tones, and feedback.">
              <Slider
                className="w-48"
                label="Master volume"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                onChange={(v) => updateSettings({ masterVolume: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
            </Field>
            <Field label="Metronome volume">
              <Slider
                className="w-48"
                label="Metronome volume"
                min={0}
                max={1}
                step={0.05}
                value={settings.metronomeVolume}
                onChange={(v) => updateSettings({ metronomeVolume: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
            </Field>
            <Field label="Metronome sound">
              <div className="flex items-center gap-2">
                <Segmented
                  label="Metronome sound"
                  size="sm"
                  value={settings.metronomeSound}
                  onChange={(v) => updateSettings({ metronomeSound: v as MetronomeSound })}
                  options={[
                    { value: "click", label: "Click" },
                    { value: "woodblock", label: "Wood" },
                    { value: "beep", label: "Beep" },
                    { value: "soft", label: "Soft" },
                  ]}
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const ctx = await resumeAudio();
                    playClick(ctx.currentTime + 0.02, {
                      sound: settings.metronomeSound,
                      volume: settings.metronomeVolume * settings.masterVolume,
                      accent: true,
                    });
                  }}
                >
                  Preview
                </Button>
              </div>
            </Field>
            <Field label="Feedback sounds" description="Short cues for correct / incorrect responses.">
              <div className="flex items-center gap-2">
                <Switch
                  label="Feedback sounds"
                  checked={settings.feedbackSounds}
                  onChange={(v) => updateSettings({ feedbackSounds: v })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await resumeAudio();
                    playFeedback("success", settings.masterVolume * 0.5);
                  }}
                >
                  Test
                </Button>
              </div>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Training defaults" />
          <CardBody className="divide-y divide-line pt-0">
            <Field label="Session length" description="Controls how many beats / trials each exercise runs.">
              <Segmented
                label="Session length"
                size="sm"
                value={settings.sessionLength}
                onChange={(v) => updateSettings({ sessionLength: v as SessionLength })}
                options={(Object.keys(SESSION_LENGTHS) as SessionLength[]).map((k) => ({
                  value: k,
                  label: SESSION_LENGTHS[k].label,
                }))}
              />
            </Field>
            <Field label="Difficulty preference" description="Adaptive remembers your last unlocked tier per exercise.">
              <Segmented
                label="Difficulty preference"
                size="sm"
                value={settings.difficultyPreference}
                onChange={(v) => updateSettings({ difficultyPreference: v })}
                options={[
                  { value: "adaptive", label: "Adaptive" },
                  { value: "manual", label: "Manual" },
                ]}
              />
            </Field>
            <Field label="Daily goal (minutes)">
              <Slider
                className="w-48"
                label="Daily goal"
                min={5}
                max={60}
                step={5}
                value={settings.dailyGoalMinutes}
                onChange={(v) => updateSettings({ dailyGoalMinutes: v })}
                format={(v) => `${v}m`}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Keyboard mapping"
            description="Keys use physical positions (KeyboardEvent.code). Click a finger, then press a key."
            action={
              <Button size="sm" variant="ghost" onClick={() => updateSettings({ keyMapping: DEFAULT_KEY_MAPPING })}>
                Reset map
              </Button>
            }
          />
          <CardBody className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["left", "right"] as const).map((hand) => (
                <div key={hand} className="space-y-2">
                  <div className="text-[13px] font-medium">{hand === "left" ? "Left hand" : "Right hand"}</div>
                  {ALL_FINGERS.filter((f) => f.startsWith(hand)).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setListeningFor(id)}
                      className="flex w-full items-center justify-between rounded-[10px] border border-line bg-bg px-3 py-2 text-left text-[13px] hover:border-line-strong"
                    >
                      <span className="text-muted">{fingerDisplay(id).fingerLabel}</span>
                      {listeningFor === id ? (
                        <span className="text-accent">Press a key…</span>
                      ) : (
                        <Kbd size="sm">{keyLabel(settings.keyMapping[id])}</Kbd>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-subtle">
              Both thumbs may share Space. The training screen tells you which thumb is intended.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Audio input" description="Used by Note Recognition. Requested only when you open that module." />
          <CardBody className="divide-y divide-line pt-0">
            <Field label="Instrument profile">
              <Select
                value={settings.instrument}
                onChange={(e) => updateSettings({ instrument: e.target.value as InstrumentId })}
              >
                {(Object.keys(INSTRUMENTS) as InstrumentId[]).map((id) => (
                  <option key={id} value={id}>
                    {INSTRUMENTS[id].name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note input source">
              <Segmented
                label="Note input"
                size="sm"
                value={settings.noteInputSource}
                onChange={(v) => updateSettings({ noteInputSource: v as NoteInputSource })}
                options={[
                  { value: "microphone", label: "Microphone" },
                  { value: "midi", label: "MIDI" },
                ]}
              />
            </Field>
            <Field label="Input device">
              <Select
                className="max-w-[220px]"
                value={settings.audioInputDeviceId}
                onChange={(e) => updateSettings({ audioInputDeviceId: e.target.value })}
              >
                <option value="">System default</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || "Microphone"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Noise gate" description="RMS below this is treated as silence. Prefer calibrating in Note Recognition.">
              <Slider
                className="w-48"
                label="Noise gate"
                min={0.002}
                max={0.08}
                step={0.001}
                value={settings.noiseGate}
                onChange={(v) => updateSettings({ noiseGate: v })}
                format={(v) => v.toFixed(3)}
              />
            </Field>
            <Field label="Latency offset (ms)" description="Added to tap timestamps if your output feels late.">
              <Slider
                className="w-48"
                label="Latency offset"
                min={-80}
                max={80}
                step={1}
                value={settings.latencyOffsetMs}
                onChange={(v) => updateSettings({ latencyOffsetMs: v })}
                format={(v) => `${v}ms`}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Learn Fretboard"
            description="Tuning and display for the guitar note-mastery module. Changing tuning recalculates every position."
            action={
              <Button size="sm" variant="ghost" onClick={() => updateFretboardSettings({ ...DEFAULT_FRETBOARD })}>
                Reset
              </Button>
            }
          />
          <CardBody className="divide-y divide-line pt-0">
            <Field label="Tuning">
              <Select
                value={settings.fretboard.tuningId}
                onChange={(e) => updateFretboardSettings({ tuningId: e.target.value as TuningId })}
              >
                {(Object.keys(TUNINGS) as Exclude<TuningId, "custom">[]).map((id) => (
                  <option key={id} value={id}>
                    {TUNINGS[id].label} · {TUNINGS[id].description}
                  </option>
                ))}
                <option value="custom">Custom (uses saved MIDI opens)</option>
              </Select>
            </Field>
            <Field label="Fret count">
              <Segmented
                label="Fret count"
                size="sm"
                value={settings.fretboard.fretCount}
                onChange={(v) =>
                  updateFretboardSettings({
                    fretCount: v as 12 | 15 | 17 | 21 | 24,
                    maxFret: Math.min(settings.fretboard.maxFret, v as number),
                  })
                }
                options={[12, 15, 17, 21, 24].map((n) => ({ value: n, label: String(n) }))}
              />
            </Field>
            <Field label="Handedness" description="Mirrors the fretboard for left-handed visualization.">
              <Segmented
                label="Handedness"
                size="sm"
                value={settings.fretboard.handedness}
                onChange={(v) => updateFretboardSettings({ handedness: v as FretboardHandedness })}
                options={[
                  { value: "right", label: "Right" },
                  { value: "left", label: "Left" },
                ]}
              />
            </Field>
            <Field label="Accidentals">
              <Segmented
                label="Accidentals"
                size="sm"
                value={settings.fretboard.accidentalPreference}
                onChange={(v) => updateFretboardSettings({ accidentalPreference: v as AccidentalPreference })}
                options={[
                  { value: "sharps", label: "Sharps" },
                  { value: "flats", label: "Flats" },
                ]}
              />
            </Field>
            <Field label="Show octave info in labels">
              <Switch
                label="Show octaves"
                checked={settings.fretboard.showOctaves}
                onChange={(v) => updateFretboardSettings({ showOctaves: v })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Finger training assistance"
            description="Defaults follow difficulty. These switches override display without changing scoring or key mapping."
          />
          <CardBody className="divide-y divide-line pt-0">
            <Field label="Show hand illustrations" description="When off, only PIMA labels and prompts remain.">
              <Switch
                label="Show hand illustrations"
                checked={settings.showFingerHands}
                onChange={(v) => updateSettings({ showFingerHands: v })}
              />
            </Field>
            <Field
              label="Show anatomical names"
              description="Adds thumb/index/… labels alongside PIMA (P, I, M, A, C for pinky)."
            >
              <Switch
                label="Show anatomical names"
                checked={settings.showFingerAnatomicalNames}
                onChange={(v) => updateSettings({ showFingerAnatomicalNames: v })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Visual feedback" />
          <CardBody className="divide-y divide-line pt-0">
            <Field label="Beat flash" description="Pulse the Maintain Tempo pad on each metronome click.">
              <Switch
                label="Beat flash"
                checked={settings.showBeatFlash}
                onChange={(v) => updateSettings({ showBeatFlash: v })}
              />
            </Field>
            <Field label="Timing offsets" description="Show early/late deviation graph and stats after Maintain the Tempo.">
              <Switch
                label="Timing offsets"
                checked={settings.showTimingOffsets}
                onChange={(v) => updateSettings({ showTimingOffsets: v })}
              />
            </Field>
            <Field label="Reduce motion">
              <Switch
                label="Reduce motion"
                checked={settings.reducedMotion}
                onChange={(v) => updateSettings({ reducedMotion: v })}
              />
            </Field>
            <Field label="Theme">
              <Segmented
                label="Theme"
                size="sm"
                value={settings.theme}
                onChange={(v) => updateSettings({ theme: v as ThemePreference })}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                  { value: "system", label: "System" },
                ]}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Data" description="Everything is stored locally in this browser." />
          <CardBody className="flex flex-wrap gap-2 pt-0">
            <Button
              variant="secondary"
              onClick={() => {
                updateSettings({ ...DEFAULT_SETTINGS, displayName: settings.displayName });
                toast("Settings restored to defaults");
              }}
            >
              Reset settings
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const snap = resetProgress();
                toast("Progress cleared", {
                  label: "Undo",
                  onClick: () => restoreSnapshot(snap),
                });
              }}
            >
              Clear progress
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
