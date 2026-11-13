/** Application timezone for daily puzzle reset. Documented to users as UTC. */
export const PUZZLE_TIMEZONE = "UTC";

/** Stable calendar day key in UTC (YYYY-MM-DD). */
export function puzzleDayKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parsePuzzleDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Milliseconds until next UTC midnight. */
export function msUntilNextPuzzle(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(0, next - now.getTime());
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatPuzzleDate(key: string) {
  return parsePuzzleDay(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Previous N UTC puzzle dates (excluding today). */
export function recentPuzzleDates(count: number, today = puzzleDayKey()): string[] {
  const base = parsePuzzleDay(today);
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(puzzleDayKey(d));
  }
  return out;
}
