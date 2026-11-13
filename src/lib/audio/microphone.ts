import type { InstrumentProfile } from "./instruments";
import { getAudioContext } from "./context";

export type MicPermission = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

export async function queryMicPermission(): Promise<MicPermission> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state as MicPermission;
  } catch {
    return "unknown";
  }
}

export async function listAudioInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "audioinput");
}

/**
 * Microphone capture chain: source → high-pass (rumble, handling noise) →
 * low-pass (hiss, upper harmonics that cause octave errors) → analyser.
 * Browser voice processing is disabled because echo cancellation, noise
 * suppression and AGC distort pitch and level.
 */
export class MicrophoneInput {
  readonly analyser: AnalyserNode;
  readonly buffer: Float32Array<ArrayBuffer>;
  private readonly nodes: AudioNode[];

  private constructor(
    readonly stream: MediaStream,
    readonly context: AudioContext,
    profile: InstrumentProfile,
  ) {
    const source = context.createMediaStreamSource(stream);
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = profile.highpassHz;
    highpass.Q.value = 0.707;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = profile.lowpassHz;
    lowpass.Q.value = 0.707;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = profile.bufferSize;
    this.analyser.smoothingTimeConstant = 0;
    source.connect(highpass).connect(lowpass).connect(this.analyser);
    this.nodes = [source, highpass, lowpass, this.analyser];
    this.buffer = new Float32Array(new ArrayBuffer(profile.bufferSize * 4));
  }

  static async open(profile: InstrumentProfile, deviceId?: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    const context = getAudioContext();
    if (context.state !== "running") await context.resume();
    return new MicrophoneInput(stream, context, profile);
  }

  /** Latest time-domain frame (written into a shared, preallocated buffer). */
  read() {
    this.analyser.getFloatTimeDomainData(this.buffer);
    return this.buffer;
  }

  get frameDurationMs() {
    return (this.buffer.length / this.context.sampleRate) * 1000;
  }

  close() {
    for (const n of this.nodes) n.disconnect();
    for (const t of this.stream.getTracks()) t.stop();
  }
}

export function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow it from your browser's site settings (the icon left of the address bar), then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found. Connect one or pick another input device in Settings.";
    case "NotReadableError":
      return "Your microphone is in use by another application. Close it and try again.";
    default:
      return "The microphone could not be started. Check your device and try again.";
  }
}
