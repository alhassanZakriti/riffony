import { NextResponse } from "next/server";
import { gradePuzzle } from "@/features/daily-puzzle/generator";
import { puzzleDayKey } from "@/features/daily-puzzle/date";
import type { PuzzleAnswer } from "@/features/daily-puzzle/types";

export async function POST(request: Request) {
  let body: { date?: string; answer?: PuzzleAnswer };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const date = body.date ?? puzzleDayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (date > puzzleDayKey()) {
    return NextResponse.json({ error: "Puzzle not available yet" }, { status: 404 });
  }
  if (!body.answer || typeof body.answer !== "object" || !("kind" in body.answer)) {
    return NextResponse.json({ error: "Missing answer" }, { status: 400 });
  }

  const result = gradePuzzle(date, body.answer);
  return NextResponse.json({ result });
}
