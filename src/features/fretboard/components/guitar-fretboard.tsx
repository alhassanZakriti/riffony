"use client";

import { useMemo } from "react";
import type { AccidentalPreference } from "@/types";
import { cn } from "@/lib/utils";
import type { FretPosition, GuitarString } from "../types";
import { noteAt, positionsEqual } from "../engine/note-calculator";
import { STRING_LABELS } from "../engine/tuning";

const MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const DOUBLE_MARKER_FRETS = new Set([12, 24]);

/** Conventional right-handed neck: low E (6) at top → high E (1) at bottom. */
export const CONVENTIONAL_STRING_ORDER: GuitarString[] = [6, 5, 4, 3, 2, 1];

export type FretHighlight =
  | "idle"
  | "prompt"
  | "selected"
  | "correct"
  | "incorrect"
  | "hint"
  | "reference"
  | "mastered"
  | "learning"
  | "weak"
  | "untrained";

export interface GuitarFretboardProps {
  openMidi: readonly [number, number, number, number, number, number];
  fretCount?: number;
  preference?: AccidentalPreference;
  handedness?: "right" | "left";
  /** Study mode: paint note names on every fret. Never use during active challenges. */
  showNoteNames?: boolean;
  /**
   * When false (default during challenges), highlights never reveal note names,
   * and accessibility labels omit the pitch so assistive tech cannot leak answers.
   */
  revealAnswerLabels?: boolean;
  interactive?: boolean;
  highlights?: Partial<Record<string, FretHighlight>>;
  onSelect?: (pos: FretPosition) => void;
  className?: string;
  /** Override string order visually; default is conventional low-E-at-top. */
  stringOrder?: GuitarString[];
}

function keyOf(p: FretPosition) {
  return `${p.string}-${p.fret}`;
}

const HIGHLIGHT_FILL: Record<FretHighlight, string> = {
  idle: "transparent",
  prompt: "var(--accent)",
  selected: "color-mix(in srgb, var(--fg) 85%, transparent)",
  correct: "var(--success)",
  incorrect: "var(--error)",
  hint: "var(--warning)",
  reference: "var(--accent)",
  mastered: "color-mix(in srgb, var(--success) 55%, transparent)",
  learning: "color-mix(in srgb, var(--warning) 55%, transparent)",
  weak: "color-mix(in srgb, var(--error) 55%, transparent)",
  untrained: "color-mix(in srgb, var(--subtle) 35%, transparent)",
};

export function GuitarFretboard({
  openMidi,
  fretCount = 12,
  preference = "sharps",
  handedness = "right",
  showNoteNames = false,
  revealAnswerLabels = false,
  interactive = true,
  highlights = {},
  onSelect,
  className,
  stringOrder = CONVENTIONAL_STRING_ORDER,
}: GuitarFretboardProps) {
  const frets = useMemo(() => Array.from({ length: fretCount + 1 }, (_, i) => i), [fretCount]);

  const fretXs = useMemo(() => {
    const xs: number[] = [0];
    let x = 0;
    for (let i = 1; i <= fretCount; i++) {
      const width = 28 * Math.pow(0.97, i - 1);
      x += width;
      xs.push(x);
    }
    return xs;
  }, [fretCount]);

  const boardWidth = fretXs[fretXs.length - 1] + 36;
  const boardHeight = 168;
  const nutX = 36;
  const stringYs = stringOrder.map((_, i) => 22 + i * ((boardHeight - 36) / (stringOrder.length - 1)));
  const mirror = handedness === "left";
  const showPitchText = showNoteNames || revealAnswerLabels;

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${boardWidth + nutX + 8} ${boardHeight + 28}`}
        className="mx-auto h-auto w-full min-w-[640px] max-w-5xl"
        role="img"
        aria-label={`Guitar fretboard, ${fretCount} frets, low E at top`}
      >
        <g transform={mirror ? `translate(${boardWidth + nutX + 8},0) scale(-1,1)` : undefined}>
          <rect x={nutX} y={10} width={boardWidth} height={boardHeight - 12} rx={4} fill="var(--elevated)" stroke="var(--line-strong)" />
          <rect x={nutX - 4} y={10} width={4} height={boardHeight - 12} fill="var(--fg)" opacity={0.85} />

          {fretXs.slice(1).map((x, i) => (
            <line
              key={`wire-${i + 1}`}
              x1={nutX + x}
              y1={12}
              x2={nutX + x}
              y2={boardHeight - 4}
              stroke="var(--line-strong)"
              strokeWidth={i + 1 === 12 ? 2.5 : 1.5}
            />
          ))}

          {frets.filter((f) => f > 0 && MARKER_FRETS.has(f)).map((f) => {
            const mid = nutX + (fretXs[f - 1] + fretXs[f]) / 2;
            if (DOUBLE_MARKER_FRETS.has(f)) {
              return (
                <g key={`m-${f}`}>
                  <circle cx={mid} cy={boardHeight / 2 - 22} r={4} fill="var(--subtle)" opacity={0.55} />
                  <circle cx={mid} cy={boardHeight / 2 + 18} r={4} fill="var(--subtle)" opacity={0.55} />
                </g>
              );
            }
            return <circle key={`m-${f}`} cx={mid} cy={boardHeight / 2 - 2} r={4.5} fill="var(--subtle)" opacity={0.5} />;
          })}

          {stringOrder.map((string, i) => (
            <line
              key={`str-${string}`}
              x1={nutX - 4}
              y1={stringYs[i]}
              x2={nutX + boardWidth}
              y2={stringYs[i]}
              stroke="var(--muted)"
              strokeWidth={1.2 + (6 - string) * 0.35}
              opacity={0.85}
            />
          ))}

          {stringOrder.map((string, si) =>
            frets.map((fret) => {
              const pos = { string, fret };
              const k = keyOf(pos);
              const hl = highlights[k] ?? "idle";
              const note = noteAt(pos, openMidi, preference);
              const cx = fret === 0 ? nutX - 14 : nutX + (fretXs[fret - 1] + fretXs[fret]) / 2;
              const cy = stringYs[si];
              const showDot = hl !== "idle" || showNoteNames;
              const safeLabel = `${STRING_LABELS[string]}, fret ${fret}`;
              const fullLabel = `${safeLabel}, ${note.fullName}`;
              return (
                <g key={k}>
                  {interactive && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={11}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => onSelect?.(pos)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect?.(pos);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={showPitchText ? fullLabel : safeLabel}
                    >
                      <title>{showPitchText ? fullLabel : safeLabel}</title>
                    </circle>
                  )}
                  {showDot && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={hl === "prompt" || hl === "reference" ? 9 : 7.5}
                      fill={HIGHLIGHT_FILL[hl] === "transparent" ? "var(--elevated)" : HIGHLIGHT_FILL[hl]}
                      stroke={hl === "idle" ? "var(--line-strong)" : "color-mix(in srgb, var(--fg) 35%, transparent)"}
                      strokeWidth={1}
                      className={cn(interactive && "pointer-events-none", hl === "prompt" && "animate-pulse")}
                    />
                  )}
                  {showDot && (
                    <text
                      x={cx}
                      y={cy + 3.5}
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      style={{
                        fill:
                          hl === "selected" || hl === "prompt" || hl === "reference"
                            ? "var(--accent-fg)"
                            : "var(--fg)",
                        fontSize: 8,
                        fontWeight: 600,
                      }}
                    >
                      {labelForHighlight(hl, note.name, showNoteNames, revealAnswerLabels)}
                    </text>
                  )}
                </g>
              );
            }),
          )}
        </g>

        {stringOrder.map((string, i) => (
          <text
            key={`label-${string}`}
            x={mirror ? boardWidth + nutX - 2 : 2}
            y={stringYs[i] + 3}
            fill="var(--muted)"
            fontSize={8}
            fontWeight={600}
          >
            {string}·{string === 6 || string === 1 ? "E" : STRING_LABELS[string].charAt(0)}
          </text>
        ))}

        {frets.filter((f) => f > 0).map((f) => {
          const mid = nutX + (fretXs[f - 1] + fretXs[f]) / 2;
          const x = mirror ? boardWidth + nutX + 8 - mid : mid;
          return (
            <text key={`fn-${f}`} x={x} y={boardHeight + 22} textAnchor="middle" fill="var(--subtle)" fontSize={9}>
              {f}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function labelForHighlight(
  hl: FretHighlight,
  noteName: string,
  showNoteNames: boolean,
  revealAnswerLabels: boolean,
) {
  if (showNoteNames) return noteName;
  if (hl === "incorrect") return "×";
  // Prompt / selected / hint / reference never leak the pitch until revealAnswerLabels.
  if (!revealAnswerLabels) return "";
  if (hl === "correct" || hl === "hint" || hl === "reference" || hl === "prompt") return noteName;
  return "";
}

export function highlightsFromPositions(
  positions: FretPosition[],
  tone: FretHighlight,
  base: Partial<Record<string, FretHighlight>> = {},
) {
  const next = { ...base };
  for (const p of positions) next[keyOf(p)] = tone;
  return next;
}

export function mergeHighlight(
  map: Partial<Record<string, FretHighlight>>,
  pos: FretPosition,
  tone: FretHighlight,
) {
  return { ...map, [keyOf(pos)]: tone };
}

export { positionsEqual, keyOf };
