"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, RefreshCw } from "lucide-react";
import { MicMeter } from "@/components/audio/mic-meter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/controls";
import { Card, CardBody } from "@/components/ui/card";
import { INSTRUMENTS } from "@/lib/audio/instruments";
import { describeMicError, listAudioInputs, MicrophoneInput, queryMicPermission, type MicPermission } from "@/lib/audio/microphone";
import { PitchEngine } from "@/lib/audio/pitch-engine";
import { resumeAudio } from "@/lib/audio/context";
import { midiToNote } from "@/lib/music/notes";
import { useAppStore } from "@/lib/store";
import { round } from "@/lib/utils";

export function CalibrationPanel({ onReady }: { onReady: () => void }) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const profile = INSTRUMENTS[settings.instrument];

  const [permission, setPermission] = useState<MicPermission>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [freq, setFreq] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [gatePreview, setGatePreview] = useState(settings.noiseGate);
  const [connected, setConnected] = useState(false);

  const engineRef = useRef<PitchEngine | null>(null);
  const noiseSamples = useRef<number[]>([]);
  const calibratingRef = useRef(false);

  useEffect(() => {
    void queryMicPermission().then(setPermission);
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const connect = async () => {
    setError(null);
    try {
      await resumeAudio();
      engineRef.current?.dispose();
      const mic = await MicrophoneInput.open(profile, settings.audioInputDeviceId || undefined);
      const engine = new PitchEngine(mic, profile, settings.noiseGate);
      engineRef.current = engine;
      engine.onFrame((frame) => {
        setLevel(frame.rms);
        setPeak(engine.peak);
        setFreq(frame.frequency);
        setNote(frame.midi != null ? midiToNote(frame.midi).name : null);
        if (calibratingRef.current) noiseSamples.current.push(frame.rms);
      });
      engine.start();
      setConnected(true);
      setPermission("granted");
      const list = await listAudioInputs();
      setDevices(list);
    } catch (err) {
      setError(describeMicError(err));
      setPermission("denied");
      setConnected(false);
    }
  };

  const runNoiseCalibration = async () => {
    if (!engineRef.current) await connect();
    if (!engineRef.current) return;
    calibratingRef.current = true;
    setCalibrating(true);
    noiseSamples.current = [];
    engineRef.current.peak = 0;
    await new Promise((r) => setTimeout(r, 2000));
    const samples = noiseSamples.current;
    calibratingRef.current = false;
    setCalibrating(false);
    if (samples.length < 10) return;
    samples.sort((a, b) => a - b);
    const p90 = samples[Math.floor(samples.length * 0.9)];
    const gate = Math.min(0.08, Math.max(0.004, p90 * 2.5));
    setGatePreview(gate);
    updateSettings({ noiseGate: gate });
    engineRef.current.setNoiseGate(gate);
  };

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium">Audio input calibration</h2>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
              Note Recognition needs your microphone to hear pitches from your {profile.name.toLowerCase()}. Audio stays in
              the browser — nothing is uploaded. Play single notes for best results.
            </p>
          </div>
          <Badge tone={permission === "granted" ? "success" : permission === "denied" ? "error" : "neutral"}>
            Mic: {permission}
          </Badge>
        </div>

        {error && <p className="rounded-[10px] border border-error/30 bg-error/10 px-3 py-2 text-[13px] text-error">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] border border-line bg-elevated/30 p-3">
            <div className="text-[12px] text-muted">Instrument profile</div>
            <div className="mt-1 text-[14px] font-medium">{profile.name}</div>
            <p className="mt-1 text-[12px] text-subtle">{profile.description}</p>
          </div>
          <div className="rounded-[12px] border border-line bg-elevated/30 p-3">
            <div className="text-[12px] text-muted">Live detection</div>
            <div className="mt-1 tabular text-[14px] font-medium">
              {note ?? "—"} {freq != null ? `· ${round(freq, 1)} Hz` : ""}
            </div>
            <p className="mt-1 text-[12px] text-subtle">Noise gate {round(gatePreview, 4)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Input level</span>
            <span>gate marker · peak marker</span>
          </div>
          <MicMeter level={level} peak={peak} gate={gatePreview} />
        </div>

        {devices.length > 0 && (
          <label className="block space-y-1.5 text-[13px]">
            <span className="text-muted">Input device</span>
            <select
              className="h-9 w-full rounded-[10px] border border-line bg-bg px-3 text-fg"
              value={settings.audioInputDeviceId}
              onChange={(e) => {
                updateSettings({ audioInputDeviceId: e.target.value });
                void connect();
              }}
            >
              <option value="">System default</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || "Microphone"}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void connect()}>
            <Mic className="size-4" />
            {connected ? "Reconnect" : "Allow microphone"}
          </Button>
          <Button variant="secondary" disabled={!connected || calibrating} onClick={() => void runNoiseCalibration()}>
            <RefreshCw className={calibrating ? "size-4 animate-spin" : "size-4"} />
            {calibrating ? "Stay quiet…" : "Calibrate noise floor (2s)"}
          </Button>
          <Button variant="ghost" disabled={!connected} onClick={onReady}>
            Continue to training
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
