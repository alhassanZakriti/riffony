import { describe, expect, it } from "vitest";
import { YinDetector } from "@/lib/audio/pitch/yin";
import { PitchTracker } from "@/lib/audio/pitch/tracker";
import { INSTRUMENTS } from "@/lib/audio/instruments";
import { analyzeFrequency, midiToFrequency, parseNoteName } from "@/lib/music/notes";

const SR = 48000;

function harmonicSignal(f0: number, n: number, opts: { harmonics?: number[]; noise?: number; phase?: number } = {}) {
  const { harmonics = [1, 0.5, 0.3, 0.2], noise = 0, phase = 0 } = opts;
  const buf = new Float32Array(n);
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < n; i++) {
    let v = 0;
    harmonics.forEach((a, k) => {
      v += a * Math.sin(2 * Math.PI * f0 * (k + 1) * (i / SR) + phase * (k + 1));
    });
    buf[i] = 0.2 * v + noise * (rand() * 2 - 1);
  }
  return buf;
}

describe("note math", () => {
  it("maps A4 and C4 correctly", () => {
    expect(parseNoteName("A4")).toBe(69);
    expect(parseNoteName("C4")).toBe(60);
    expect(midiToFrequency(69)).toBeCloseTo(440);
    expect(analyzeFrequency(261.63).note.name).toBe("C4");
  });

  it("reports cents deviation", () => {
    const sharp = 440 * 2 ** (20 / 1200);
    const a = analyzeFrequency(sharp);
    expect(a.note.name).toBe("A4");
    expect(a.cents).toBeCloseTo(20, 1);
  });
});

describe("YIN detector", () => {
  for (const profile of [INSTRUMENTS.piano, INSTRUMENTS.guitar]) {
    const yin = new YinDetector({
      sampleRate: SR,
      bufferSize: profile.bufferSize,
      minFrequency: profile.minFrequency,
      maxFrequency: profile.maxFrequency,
      threshold: profile.yinThreshold,
    });

    for (const name of ["E2", "A2", "C4", "A4", "E5", "C6"]) {
      const midi = parseNoteName(name);
      const f = midiToFrequency(midi);
      if (f < profile.minFrequency || f > profile.maxFrequency) continue;
      it(`${profile.id}: detects ${name} within 5 cents`, () => {
        const est = yin.detect(harmonicSignal(f, profile.bufferSize, { noise: 0.02 }));
        expect(est).not.toBeNull();
        const { note, cents } = analyzeFrequency(est!.frequency);
        expect(note.midi).toBe(midi);
        expect(Math.abs(cents)).toBeLessThan(5);
        expect(est!.clarity).toBeGreaterThan(0.85);
      });
    }

    it(`${profile.id}: is not fooled by a weak fundamental`, () => {
      const f = midiToFrequency(parseNoteName("A3"));
      const est = yin.detect(harmonicSignal(f, profile.bufferSize, { harmonics: [0.3, 1, 0.6, 0.4] }));
      expect(analyzeFrequency(est!.frequency).note.name).toBe("A3");
    });

    it(`${profile.id}: reports low clarity for noise`, () => {
      const est = yin.detect(harmonicSignal(440, profile.bufferSize, { harmonics: [], noise: 0.3 }));
      expect(est === null || est.clarity < profile.minClarity).toBe(true);
    });
  }
});

describe("pitch tracker", () => {
  const opts = { noiseGate: 0.01, minClarity: 0.8, minFrequency: 60, maxFrequency: 2000, stableFrames: 3 };

  it("emits a stable note once after enough frames", () => {
    const t = new PitchTracker(opts);
    const emits = [0, 1, 2, 3, 4].map((i) => t.push({ frequency: 440, clarity: 0.95 }, 0.1, i * 16).stable);
    expect(emits.filter(Boolean)).toHaveLength(1);
    expect(emits[2]?.midi).toBe(69);
    expect(emits[2]?.onsetTime).toBe(0);
  });

  it("tolerates a single octave glitch", () => {
    const t = new PitchTracker(opts);
    const freqs = [440, 880, 440, 440];
    const out = freqs.map((f, i) => t.push({ frequency: f, clarity: 0.95 }, 0.1, i).stable);
    expect(out[3]?.midi).toBe(69);
  });

  it("gates quiet input", () => {
    const t = new PitchTracker(opts);
    const out = [0, 1, 2, 3].map((i) => t.push({ frequency: 440, clarity: 0.95 }, 0.001, i));
    expect(out.every((o) => !o.frame.voiced && !o.stable)).toBe(true);
  });
});
