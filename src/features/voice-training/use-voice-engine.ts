"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INSTRUMENTS } from "@/lib/audio/instruments";
import { describeMicError, MicrophoneInput } from "@/lib/audio/microphone";
import { PitchEngine } from "@/lib/audio/pitch-engine";
import { resumeAudio } from "@/lib/audio/context";
import { useAppStore } from "@/lib/store";
import type { StableNote, TrackerFrame } from "@/lib/audio/pitch/tracker";

/**
 * Voice-only pitch engine. Forces the voice instrument profile so singing
 * analysis stays independent of the user's guitar/piano preference.
 */
export function useVoiceEngine() {
  const settings = useAppStore((s) => s.settings);
  const [level, setLevel] = useState(0);
  const [frame, setFrame] = useState<TrackerFrame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const engineRef = useRef<PitchEngine | null>(null);
  const noteHandler = useRef<((note: StableNote) => void) | null>(null);

  const dispose = useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
    setReady(false);
    setFrame(null);
    setLevel(0);
  }, []);

  useEffect(() => () => dispose(), [dispose]);

  const start = useCallback(async () => {
    setError(null);
    dispose();
    try {
      await resumeAudio();
      const profile = INSTRUMENTS.voice;
      const mic = await MicrophoneInput.open(profile, settings.audioInputDeviceId || undefined);
      const engine = new PitchEngine(mic, profile, settings.noiseGate);
      engineRef.current = engine;
      engine.onFrame((f) => {
        setLevel(f.rms);
        setFrame(f);
      });
      engine.onStableNote((note) => noteHandler.current?.(note));
      engine.start();
      setReady(true);
      return true;
    } catch (err) {
      setError(describeMicError(err));
      setReady(false);
      return false;
    }
  }, [dispose, settings.audioInputDeviceId, settings.noiseGate]);

  const onStableNote = useCallback((fn: (note: StableNote) => void) => {
    noteHandler.current = fn;
  }, []);

  const resetTracking = useCallback(() => {
    engineRef.current?.resetTracking();
  }, []);

  return {
    level,
    frame,
    error,
    ready,
    start,
    dispose,
    onStableNote,
    resetTracking,
    gate: settings.noiseGate,
    volume: settings.masterVolume,
    feedbackSounds: settings.feedbackSounds,
  };
}
