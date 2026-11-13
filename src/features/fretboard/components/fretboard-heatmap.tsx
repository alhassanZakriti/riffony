"use client";

import { GuitarFretboard, type FretHighlight } from "./guitar-fretboard";
import { heatTone } from "../engine/mastery";
import type { PositionMastery } from "../types";

const TONE_MAP = {
  grey: "untrained",
  red: "weak",
  yellow: "learning",
  green: "mastered",
} as const satisfies Record<string, FretHighlight>;

export function FretboardHeatmap({
  openMidi,
  mastery,
  fretCount = 12,
  preference = "sharps",
  handedness = "right",
}: {
  openMidi: readonly [number, number, number, number, number, number];
  mastery: Record<string, PositionMastery>;
  fretCount?: number;
  preference?: "sharps" | "flats";
  handedness?: "right" | "left";
}) {
  const highlights: Partial<Record<string, FretHighlight>> = {};
  for (const [key, m] of Object.entries(mastery)) {
    highlights[key] = TONE_MAP[heatTone(m)];
  }

  return (
    <div className="space-y-3">
      <GuitarFretboard
        openMidi={openMidi}
        fretCount={fretCount}
        preference={preference}
        handedness={handedness}
        interactive={false}
        showNoteNames={false}
        highlights={highlights}
      />
      <ul className="flex flex-wrap gap-3 text-[12px] text-muted">
        <Legend swatch="var(--success)" label="Mastered" />
        <Legend swatch="var(--warning)" label="Learning" />
        <Legend swatch="var(--error)" label="Needs practice" />
        <Legend swatch="var(--subtle)" label="Not yet trained" />
      </ul>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: swatch }} aria-hidden />
      {label}
    </li>
  );
}
