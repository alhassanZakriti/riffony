import type { Metadata } from "next";
import { Suspense } from "react";
import { PuzzlePlayer } from "@/features/daily-puzzle/puzzle-player";

export const metadata: Metadata = {
  title: "Daily Puzzle",
  description: "Play today’s shared RIFFONY challenge — one skill-focused puzzle every UTC day.",
};

export default function DailyPuzzlePage() {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-3xl animate-pulse rounded-[18px] bg-elevated/40" />}>
      <PuzzlePlayer />
    </Suspense>
  );
}
