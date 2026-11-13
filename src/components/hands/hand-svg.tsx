"use client";

import type { FingerId, FingerName, Hand } from "@/types";
import { cn } from "@/lib/utils";
import { parseFinger } from "@/features/finger-training/fingers";

/** Palm + finger paths for a right hand facing the user (palm view). Mirrored for left. */
const FINGER_PATHS: Record<FingerName, string> = {
  pinky:
    "M58 118 C54 96 52 72 54 48 C55 36 62 32 68 36 C74 40 74 52 73 68 C72 90 74 112 76 128",
  ring:
    "M78 122 C76 92 76 64 78 36 C79 24 87 20 93 26 C99 32 98 46 97 64 C96 90 98 114 100 132",
  middle:
    "M100 124 C100 90 102 58 104 28 C105 16 114 12 120 20 C126 28 124 44 123 66 C122 94 122 118 124 136",
  index:
    "M124 130 C126 100 130 72 134 46 C136 34 145 32 150 40 C155 48 152 62 150 80 C148 104 146 122 144 138",
  thumb:
    "M148 148 C162 140 178 132 190 128 C202 124 210 132 206 144 C202 156 186 164 170 170 C158 174 150 168 148 160",
};

const PALM = "M60 126 C58 168 72 198 110 206 C148 214 168 196 172 162 C174 148 168 140 148 148 C130 138 100 134 76 128 Z";

export function HandSvg({
  hand,
  active,
  className,
}: {
  hand: Hand;
  active?: FingerName | null;
  className?: string;
}) {
  const mirror = hand === "left";
  return (
    <svg
      viewBox="0 0 240 230"
      className={cn("w-full max-w-[220px]", className)}
      aria-hidden
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d={PALM} fill="var(--elevated)" stroke="var(--line-strong)" strokeWidth="2" />
      {(Object.keys(FINGER_PATHS) as FingerName[]).map((finger) => {
        const isActive = active === finger;
        return (
          <path
            key={finger}
            d={FINGER_PATHS[finger]}
            fill={isActive ? "color-mix(in srgb, var(--accent) 35%, var(--elevated))" : "var(--elevated)"}
            stroke={isActive ? "var(--accent)" : "var(--line-strong)"}
            strokeWidth={isActive ? 2.75 : 2}
            strokeLinejoin="round"
            className={cn(isActive && "origin-center")}
          >
            {isActive && (
              <animate attributeName="opacity" values="1;0.72;1" dur="1.1s" repeatCount="indefinite" />
            )}
          </path>
        );
      })}
    </svg>
  );
}

export function DualHands({ target, className }: { target: FingerId | null; className?: string }) {
  const parsed = target ? parseFinger(target) : null;
  return (
    <div className={cn("flex items-end justify-center gap-6 sm:gap-10", className)}>
      <div className="flex flex-col items-center gap-2">
        <HandSvg hand="left" active={parsed?.hand === "left" ? parsed.finger : null} />
        <span className="text-[12px] font-medium text-muted">Left</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <HandSvg hand="right" active={parsed?.hand === "right" ? parsed.finger : null} />
        <span className="text-[12px] font-medium text-muted">Right</span>
      </div>
    </div>
  );
}
