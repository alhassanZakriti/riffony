import type { DrumVoice } from "@/lib/audio/sounds";
import type { GuessPatternId } from "./config";

export interface PatternHit {
  /** Beat position in quarter-note units from pattern start. */
  beat: number;
  voice: DrumVoice;
}

/** One bar (4 beats) of synthesised rhythm. No copyrighted material. */
export const PATTERNS: Record<GuessPatternId, PatternHit[]> = {
  straight: [
    { beat: 0, voice: "kick" },
    { beat: 1, voice: "kick" },
    { beat: 2, voice: "kick" },
    { beat: 3, voice: "kick" },
  ],
  "kick-snare": [
    { beat: 0, voice: "kick" },
    { beat: 1, voice: "snare" },
    { beat: 2, voice: "kick" },
    { beat: 3, voice: "snare" },
  ],
  "hat-groove": [
    { beat: 0, voice: "kick" },
    { beat: 0.5, voice: "hat" },
    { beat: 1, voice: "snare" },
    { beat: 1.5, voice: "hat" },
    { beat: 2, voice: "kick" },
    { beat: 2.5, voice: "hat" },
    { beat: 3, voice: "snare" },
    { beat: 3.5, voice: "hat" },
  ],
  syncopated: [
    { beat: 0, voice: "kick" },
    { beat: 0.75, voice: "hat" },
    { beat: 1, voice: "snare" },
    { beat: 1.5, voice: "kick" },
    { beat: 2.25, voice: "hat" },
    { beat: 2.5, voice: "snare" },
    { beat: 3, voice: "kick" },
    { beat: 3.5, voice: "rim" },
  ],
};

export function expandPattern(id: GuessPatternId, bars: number, bpm: number, startTimeSec: number) {
  const beatSec = 60 / bpm;
  const hits = PATTERNS[id];
  const events: { time: number; voice: DrumVoice }[] = [];
  for (let bar = 0; bar < bars; bar++) {
    for (const h of hits) {
      events.push({ time: startTimeSec + (bar * 4 + h.beat) * beatSec, voice: h.voice });
    }
  }
  return events;
}
