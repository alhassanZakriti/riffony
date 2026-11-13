/**
 * YIN fundamental-frequency estimator (de Cheveigné & Kawahara, 2002).
 *
 * Steps: squared difference function → cumulative mean normalised difference
 * (CMND) → absolute threshold → local minimum search → parabolic interpolation.
 * Buffers are preallocated so detection allocates nothing per frame.
 */
export interface PitchEstimate {
  frequency: number;
  /** 1 − CMND at the chosen lag. ~1 for a pure periodic signal, ~0 for noise. */
  clarity: number;
}

export interface YinOptions {
  sampleRate: number;
  bufferSize: number;
  minFrequency: number;
  maxFrequency: number;
  /** Absolute CMND threshold; 0.10–0.15 is typical for instruments. */
  threshold?: number;
}

export class YinDetector {
  private readonly cmnd: Float32Array;
  private readonly tauMin: number;
  private readonly tauMax: number;
  private readonly window: number;
  private readonly threshold: number;
  readonly sampleRate: number;

  constructor({ sampleRate, bufferSize, minFrequency, maxFrequency, threshold = 0.12 }: YinOptions) {
    this.sampleRate = sampleRate;
    this.threshold = threshold;
    this.tauMin = Math.max(2, Math.floor(sampleRate / maxFrequency));
    this.tauMax = Math.min(Math.floor(bufferSize / 2), Math.ceil(sampleRate / minFrequency));
    // The integration window only needs to span a little more than the longest
    // period; capping it keeps the O(W·tauMax) cost bounded for large buffers.
    this.window = Math.min(bufferSize - this.tauMax, Math.max(1024, this.tauMax + 256));
    this.cmnd = new Float32Array(this.tauMax + 2);
  }

  detect(input: Float32Array): PitchEstimate | null {
    const { tauMax, tauMin, window: W, cmnd } = this;
    if (input.length < W + tauMax) return null;
    // Analyse the most recent samples so the estimate reflects "now".
    const buffer = input.length === W + tauMax ? input : input.subarray(input.length - W - tauMax);

    cmnd[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      for (let j = 0; j < W; j++) {
        const delta = buffer[j] - buffer[j + tau];
        sum += delta * delta;
      }
      runningSum += sum;
      cmnd[tau] = runningSum === 0 ? 1 : (sum * tau) / runningSum;
    }

    let tau = -1;
    for (let t = tauMin; t < tauMax; t++) {
      if (cmnd[t] < this.threshold) {
        while (t + 1 < tauMax && cmnd[t + 1] < cmnd[t]) t++;
        tau = t;
        break;
      }
    }

    if (tau === -1) {
      // No dip below threshold: fall back to the global minimum, which callers
      // will usually reject through the clarity threshold.
      let best = tauMin;
      for (let t = tauMin + 1; t < tauMax; t++) if (cmnd[t] < cmnd[best]) best = t;
      tau = best;
    }

    const refined = this.parabolic(tau);
    if (refined <= 0) return null;
    const frequency = this.sampleRate / refined;
    return { frequency, clarity: Math.max(0, Math.min(1, 1 - cmnd[tau])) };
  }

  private parabolic(tau: number) {
    const { cmnd, tauMax } = this;
    if (tau < 1 || tau >= tauMax) return tau;
    const s0 = cmnd[tau - 1];
    const s1 = cmnd[tau];
    const s2 = cmnd[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom === 0) return tau;
    return tau + (s2 - s0) / denom;
  }
}

export function rms(buffer: Float32Array) {
  let s = 0;
  for (let i = 0; i < buffer.length; i++) s += buffer[i] * buffer[i];
  return Math.sqrt(s / buffer.length);
}
