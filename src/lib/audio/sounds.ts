import type { MetronomeSound } from "@/types";
import { midiToFrequency } from "@/lib/music/notes";
import { getAudioContext, getMasterGain } from "./context";

/** All sounds are synthesised at runtime; no recorded or licensed audio is used. */

let noiseBuffer: AudioBuffer | null = null;
function getNoise(c: AudioContext) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function envGain(c: AudioContext, time: number, peak: number, attack: number, decay: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  return g;
}

type Stoppable = { stop: (when?: number) => void };

export function playClick(time: number, opts: { accent?: boolean; sound: MetronomeSound; volume: number }): Stoppable {
  const c = getAudioContext();
  const out = getMasterGain();
  const { accent = false, sound, volume } = opts;
  const v = volume * (accent ? 1 : 0.7);

  if (sound === "woodblock") {
    const osc = c.createOscillator();
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = accent ? 1800 : 1300;
    bp.Q.value = 8;
    osc.type = "triangle";
    osc.frequency.value = accent ? 1800 : 1300;
    const g = envGain(c, time, v, 0.001, 0.06);
    osc.connect(bp).connect(g).connect(out);
    osc.start(time);
    osc.stop(time + 0.1);
    return osc;
  }

  const osc = c.createOscillator();
  const settings: Record<Exclude<MetronomeSound, "woodblock">, { type: OscillatorType; f: number; decay: number }> = {
    click: { type: "square", f: accent ? 2000 : 1500, decay: 0.025 },
    beep: { type: "sine", f: accent ? 1320 : 880, decay: 0.09 },
    soft: { type: "sine", f: accent ? 660 : 520, decay: 0.12 },
  };
  const s = settings[sound];
  osc.type = s.type;
  osc.frequency.value = s.f;
  const g = envGain(c, time, sound === "click" ? v * 0.35 : v * 0.6, 0.001, s.decay);
  osc.connect(g).connect(out);
  osc.start(time);
  osc.stop(time + s.decay + 0.05);
  return osc;
}

export type DrumVoice = "kick" | "snare" | "hat" | "rim";

export function playDrum(voice: DrumVoice, time: number, volume: number): Stoppable {
  const c = getAudioContext();
  const out = getMasterGain();

  if (voice === "kick") {
    const osc = c.createOscillator();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    const g = envGain(c, time, volume, 0.002, 0.25);
    osc.connect(g).connect(out);
    osc.start(time);
    osc.stop(time + 0.3);
    return osc;
  }

  if (voice === "rim") {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 900;
    const g = envGain(c, time, volume * 0.5, 0.001, 0.04);
    osc.connect(g).connect(out);
    osc.start(time);
    osc.stop(time + 0.08);
    return osc;
  }

  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const filter = c.createBiquadFilter();
  if (voice === "snare") {
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
  } else {
    filter.type = "highpass";
    filter.frequency.value = 7000;
  }
  const g = envGain(c, time, voice === "snare" ? volume * 0.7 : volume * 0.3, 0.001, voice === "snare" ? 0.14 : 0.04);
  src.connect(filter).connect(g).connect(out);
  src.start(time);
  src.stop(time + 0.2);

  if (voice === "snare") {
    const body = c.createOscillator();
    body.frequency.value = 190;
    const bg = envGain(c, time, volume * 0.4, 0.001, 0.08);
    body.connect(bg).connect(out);
    body.start(time);
    body.stop(time + 0.12);
  }
  return src;
}

/**
 * Plucked/struck reference tone built from decaying harmonics. Partials are
 * slightly weighted toward the fundamental so the pitch is unambiguous.
 */
export function playTone(midi: number, time: number, duration: number, volume: number): Stoppable {
  const c = getAudioContext();
  const out = getMasterGain();
  const f0 = midiToFrequency(midi);
  const partials = [1, 0.45, 0.22, 0.12, 0.06];
  const oscs: OscillatorNode[] = [];
  const bus = c.createGain();
  bus.gain.setValueAtTime(0.0001, time);
  bus.gain.exponentialRampToValueAtTime(volume * 0.5, time + 0.008);
  bus.gain.exponentialRampToValueAtTime(volume * 0.2, time + 0.25);
  bus.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  bus.connect(out);
  partials.forEach((amp, i) => {
    const f = f0 * (i + 1);
    if (f > c.sampleRate / 2.2) return;
    const osc = c.createOscillator();
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.value = amp;
    osc.connect(g).connect(bus);
    osc.start(time);
    osc.stop(time + duration + 0.05);
    oscs.push(osc);
  });
  return { stop: (when?: number) => oscs.forEach((o) => o.stop(when)) };
}

export function playFeedback(kind: "success" | "error" | "tick", volume: number) {
  const c = getAudioContext();
  const out = getMasterGain();
  const t = c.currentTime + 0.005;
  const notes = kind === "success" ? [1046.5, 1568] : kind === "error" ? [220, 196] : [1200];
  notes.forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = kind === "error" ? "triangle" : "sine";
    osc.frequency.value = f;
    const start = t + i * 0.06;
    const g = envGain(c, start, volume * (kind === "tick" ? 0.15 : 0.22), 0.004, 0.09);
    osc.connect(g).connect(out);
    osc.start(start);
    osc.stop(start + 0.12);
  });
}
