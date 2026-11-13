import { NextResponse } from "next/server";
import { getPublicPuzzle, getPuzzleMeta } from "@/features/daily-puzzle/generator";
import { puzzleDayKey, recentPuzzleDates } from "@/features/daily-puzzle/date";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? puzzleDayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const today = puzzleDayKey();
  if (date > today) {
    return NextResponse.json({ error: "Puzzle not available yet" }, { status: 404 });
  }

  if (searchParams.get("meta") === "archive") {
    const dates = recentPuzzleDates(14, today);
    return NextResponse.json({
      timezone: "UTC",
      today,
      archive: dates.map((d) => getPuzzleMeta(d)),
    });
  }

  const puzzle = getPublicPuzzle(date);
  return NextResponse.json({
    timezone: "UTC",
    today,
    puzzle,
  });
}
