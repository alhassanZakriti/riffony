import { analyzeFrequency, frequencyToMidiFloat } from "@/lib/music/notes";
import { median } from "@/lib/utils";
import type { PitchEstimate } from "./yin";

export interface TrackerOptions {
  noiseGate: number;
  minClarity: number;
  minFrequency: number;
  maxFrequency: number;
  /** Consecutive voiced frames on the same note required to accept it. */
  stableFrames: number;
}

export interface TrackerFrame {
  time: number;
  rms: number;
  voiced: boolean;
  frequency: number | null;
  midi: number | null;
  cents: number | null;
  clarity: number;
}

export interface StableNote {
  midi: number;
  /** Median frequency over the stable run, robust against transient frames. */
  frequency: number;
  cents: number;
  /** Timestamp (performance.now ms) of the first frame of the run. */
  onsetTime: number;
}

/**
 * Turns raw per-frame pitch estimates into musically meaningful events.
 * Applies a noise gate and clarity threshold, then requires the same note to
 * persist for several frames, tolerating one outlier frame (e.g. an octave
 * error during a pick attack) without restarting the run.
 */
export class PitchTracker {
  private runMidi: number | null = null;
  private runStart = 0;
  private runFreqs: number[] = [];
  private mismatches = 0;
  private unvoiced = 0;
  private emitted = false;

  constructor(private opts: TrackerOptions) {}

  configure(opts: Partial<TrackerOptions>) {
    this.opts = { ...this.opts, ...opts };
  }

  reset() {
    this.runMidi = null;
    this.runFreqs = [];
    this.mismatches = 0;
    this.unvoiced = 0;
    this.emitted = false;
  }

  push(estimate: PitchEstimate | null, level: number, time: number): { frame: TrackerFrame; stable: StableNote | null } {
    const { noiseGate, minClarity, minFrequency, maxFrequency, stableFrames } = this.opts;
    const voiced =
      estimate !== null &&
      level >= noiseGate &&
      estimate.clarity >= minClarity &&
      estimate.frequency >= minFrequency &&
      estimate.frequency <= maxFrequency;

    if (!voiced) {
      this.unvoiced++;
      if (this.unvoiced > 2) this.reset();
      return {
        frame: { time, rms: level, voiced: false, frequency: null, midi: null, cents: null, clarity: estimate?.clarity ?? 0 },
        stable: null,
      };
    }

    this.unvoiced = 0;
    const { note, cents } = analyzeFrequency(estimate.frequency);
    const frame: TrackerFrame = {
      time,
      rms: level,
      voiced: true,
      frequency: estimate.frequency,
      midi: note.midi,
      cents,
      clarity: estimate.clarity,
    };

    if (this.runMidi === note.midi) {
      this.runFreqs.push(estimate.frequency);
      this.mismatches = 0;
    } else if (this.runMidi !== null && this.mismatches < 1) {
      this.mismatches++;
    } else {
      this.runMidi = note.midi;
      this.runStart = time;
      this.runFreqs = [estimate.frequency];
      this.mismatches = 0;
      this.emitted = false;
    }

    let stable: StableNote | null = null;
    if (!this.emitted && this.runMidi !== null && this.runFreqs.length >= stableFrames) {
      this.emitted = true;
      const f = median(this.runFreqs);
      stable = {
        midi: this.runMidi,
        frequency: f,
        cents: (frequencyToMidiFloat(f) - this.runMidi) * 100,
        onsetTime: this.runStart,
      };
    }
    return { frame, stable };
  }
}
