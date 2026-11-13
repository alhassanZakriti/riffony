import type { InstrumentId } from "@/types";

/**
 * Per-instrument analysis profile. Adding an instrument means adding a profile
 * here; the microphone pipeline, YIN detector and tracker read from it.
 */
export interface InstrumentProfile {
  id: InstrumentId;
  name: string;
  description: string;
  minFrequency: number;
  maxFrequency: number;
  /** Analyser buffer size; larger buffers are needed for lower fundamentals. */
  bufferSize: 2048 | 4096;
  highpassHz: number;
  lowpassHz: number;
  yinThreshold: number;
  minClarity: number;
  stableFrames: number;
  supportsMidi: boolean;
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentProfile> = {
  piano: {
    id: "piano",
    name: "Piano",
    description: "Acoustic or digital piano via microphone, or a MIDI keyboard.",
    minFrequency: 50,
    maxFrequency: 2100,
    bufferSize: 4096,
    highpassHz: 40,
    lowpassHz: 5000,
    yinThreshold: 0.12,
    minClarity: 0.82,
    stableFrames: 3,
    supportsMidi: true,
  },
  guitar: {
    id: "guitar",
    name: "Guitar",
    description: "Single notes in concert pitch (E2–E5). Play one string at a time.",
    /** Covers low E2 (~82 Hz) through high fretted notes on string 1. */
    minFrequency: 75,
    maxFrequency: 1400,
    bufferSize: 4096,
    highpassHz: 55,
    lowpassHz: 4000,
    yinThreshold: 0.13,
    minClarity: 0.8,
    stableFrames: 4,
    supportsMidi: false,
  },
  voice: {
    id: "voice",
    name: "Voice",
    description: "Singing and humming. Tuned for vocal fundamentals and harmonics.",
    /** Roughly E2–C6 — covers most comfortable singing without forcing extremes. */
    minFrequency: 80,
    maxFrequency: 1100,
    bufferSize: 4096,
    highpassHz: 55,
    lowpassHz: 3500,
    yinThreshold: 0.14,
    minClarity: 0.72,
    stableFrames: 5,
    supportsMidi: false,
  },
};
