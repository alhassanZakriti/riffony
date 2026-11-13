import { parsePuzzleDay, puzzleDayKey } from "./date";
import type { DailyPuzzleAttempt } from "./types";

function shiftUtcDay(key: string, delta: number) {
  const d = parsePuzzleDay(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return puzzleDayKey(d);
}

/** Consecutive UTC days with a completed daily puzzle, ending today or yesterday. */
export function puzzleStreak(attempts: Record<string, DailyPuzzleAttempt>, today = puzzleDayKey()) {
  const has = (key: string) => Boolean(attempts[key]);
  const yesterday = shiftUtcDay(today, -1);
  if (!has(today) && !has(yesterday)) return 0;

  let key = has(today) ? today : yesterday;
  let streak = 0;
  while (has(key)) {
    streak++;
    key = shiftUtcDay(key, -1);
  }
  return streak;
}
