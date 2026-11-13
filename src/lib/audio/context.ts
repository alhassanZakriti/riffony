let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let masterVolume = 0.8;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = masterVolume;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function getMasterGain(): GainNode {
  getAudioContext();
  return master!;
}

export function setMasterVolume(v: number) {
  masterVolume = v;
  if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
}

/** Must be called from a user gesture the first time (autoplay policy). */
export async function resumeAudio() {
  const c = getAudioContext();
  if (c.state !== "running") await c.resume();
  return c;
}

/**
 * Offset (ms) that converts AudioContext time to the performance.now()
 * timeline at the moment the sound actually leaves the speakers. Uses
 * getOutputTimestamp where available, which accounts for output latency.
 */
export function contextToPerformanceOffset(c: AudioContext): number {
  const ts = c.getOutputTimestamp?.();
  if (ts && ts.contextTime && ts.performanceTime) {
    return ts.performanceTime - ts.contextTime * 1000;
  }
  const latency = (c.outputLatency || c.baseLatency || 0) * 1000;
  return performance.now() - c.currentTime * 1000 + latency;
}
