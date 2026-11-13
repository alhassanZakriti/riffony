import type { InstrumentProfile } from "./instruments";
import { MicrophoneInput } from "./microphone";
import { PitchTracker, type StableNote, type TrackerFrame } from "./pitch/tracker";
import { rms, YinDetector } from "./pitch/yin";

export type FrameListener = (frame: TrackerFrame) => void;
export type NoteListener = (note: StableNote) => void;

/**
 * Real-time pitch pipeline. Runs analysis on animation frames and pushes
 * results to listeners; it never touches React state itself, so UI layers can
 * decide how often (if at all) to re-render.
 */
export class PitchEngine {
  private detector: YinDetector;
  private tracker: PitchTracker;
  private raf = 0;
  private frameListeners = new Set<FrameListener>();
  private noteListeners = new Set<NoteListener>();
  latest: TrackerFrame | null = null;
  /** Peak RMS seen since last call to resetPeak; used for calibration. */
  peak = 0;

  constructor(
    readonly mic: MicrophoneInput,
    profile: InstrumentProfile,
    noiseGate: number,
  ) {
    this.detector = new YinDetector({
      sampleRate: mic.context.sampleRate,
      bufferSize: profile.bufferSize,
      minFrequency: profile.minFrequency,
      maxFrequency: profile.maxFrequency,
      threshold: profile.yinThreshold,
    });
    this.tracker = new PitchTracker({
      noiseGate,
      minClarity: profile.minClarity,
      minFrequency: profile.minFrequency,
      maxFrequency: profile.maxFrequency,
      stableFrames: profile.stableFrames,
    });
  }

  setNoiseGate(noiseGate: number) {
    this.tracker.configure({ noiseGate });
  }

  resetTracking() {
    this.tracker.reset();
  }

  onFrame(fn: FrameListener) {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  onStableNote(fn: NoteListener) {
    this.noteListeners.add(fn);
    return () => this.noteListeners.delete(fn);
  }

  start() {
    if (this.raf) return;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.process();
    };
    this.raf = requestAnimationFrame(loop);
  }

  private process() {
    const buffer = this.mic.read();
    const level = rms(buffer);
    if (level > this.peak) this.peak = level;
    // Skip the expensive YIN pass for silent frames.
    const estimate = level > 0.002 ? this.detector.detect(buffer) : null;
    // The analysed window ends "now"; its centre is half a frame earlier.
    const time = performance.now() - this.mic.frameDurationMs / 2;
    const { frame, stable } = this.tracker.push(estimate, level, time);
    this.latest = frame;
    for (const fn of this.frameListeners) fn(frame);
    if (stable) for (const fn of this.noteListeners) fn(stable);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.stop();
    this.frameListeners.clear();
    this.noteListeners.clear();
    this.mic.close();
  }
}
