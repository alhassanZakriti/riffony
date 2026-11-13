import type { Category, ExerciseId, SessionRecord } from "@/types";
import { addDays, dayKey, mean } from "@/lib/utils";

export const CATEGORY_LABEL: Record<Category, string> = {
  tempo: "Tempo",
  fingers: "Finger Training",
  notes: "Note Recognition",
  fretboard: "Learn Fretboard",
  voice: "Voice Training",
};

export const EXERCISE_LABEL: Record<ExerciseId, string> = {
  "tempo-maintain": "Maintain the Tempo",
  "tempo-guess": "Guess the Tempo",
  fingers: "PIMA Finger Training",
  notes: "Note Recognition",
  fretboard: "Learn Fretboard",
  "voice-match": "Pitch Matching",
  "voice-range": "Vocal Range",
  "voice-intervals": "Interval Training",
  "voice-scales": "Scale Training",
  "voice-stability": "Pitch Stability",
  "voice-warmup": "Vocal Warm-ups",
  "voice-melody": "Melodic Memory",
};

export const EXERCISE_HREF: Record<ExerciseId, string> = {
  "tempo-maintain": "/tempo?exercise=maintain",
  "tempo-guess": "/tempo?exercise=guess",
  fingers: "/fingers",
  notes: "/notes",
  fretboard: "/fretboard",
  "voice-match": "/voice",
  "voice-range": "/voice",
  "voice-intervals": "/voice",
  "voice-scales": "/voice",
  "voice-stability": "/voice",
  "voice-warmup": "/voice",
  "voice-melody": "/voice",
};

export function computeStreak(sessions: SessionRecord[], today = new Date()) {
  const days = new Set(sessions.map((s) => dayKey(s.startedAt)));
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(sessions: SessionRecord[]) {
  const days = [...new Set(sessions.map((s) => dayKey(s.startedAt)))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    const expected = prev ? dayKey(addDays(new Date(`${prev}T12:00:00`), 1)) : null;
    run = expected === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function overview(sessions: SessionRecord[]) {
  const totalMs = sessions.reduce((s, r) => s + r.durationMs, 0);
  const withAccuracy = sessions.filter((s) => s.exercise !== "tempo-guess");
  const reactions = sessions.filter((s) => s.avgReactionMs != null && s.category !== "tempo");
  return {
    totalMs,
    sessions: sessions.length,
    accuracy: withAccuracy.length ? mean(withAccuracy.map((s) => s.accuracy)) : null,
    avgReactionMs: reactions.length ? mean(reactions.map((s) => s.avgReactionMs!)) : null,
    totalCorrect: sessions.reduce((s, r) => s + r.correct, 0),
  };
}

export function todayMinutes(sessions: SessionRecord[], today = new Date()) {
  const key = dayKey(today);
  return sessions.filter((s) => dayKey(s.startedAt) === key).reduce((s, r) => s + r.durationMs, 0) / 60000;
}

export interface DailyPoint {
  day: string;
  label: string;
  sessions: number;
  minutes: number;
  score: number | null;
  tempo: number | null;
  fingers: number | null;
  notes: number | null;
  fretboard: number | null;
  voice: number | null;
}

export function dailySeries(sessions: SessionRecord[], days: number, today = new Date()): DailyPoint[] {
  const buckets = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    const list = buckets.get(k) ?? [];
    list.push(s);
    buckets.set(k, list);
  }
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const k = dayKey(d);
    const list = buckets.get(k) ?? [];
    const avg = (cat?: Category) => {
      const l = cat ? list.filter((s) => s.category === cat) : list;
      return l.length ? Math.round(mean(l.map((s) => s.score))) : null;
    };
    out.push({
      day: k,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sessions: list.length,
      minutes: Math.round(list.reduce((s, r) => s + r.durationMs, 0) / 6000) / 10,
      score: avg(),
      tempo: avg("tempo"),
      fingers: avg("fingers"),
      notes: avg("notes"),
      fretboard: avg("fretboard"),
      voice: avg("voice"),
    });
  }
  return out;
}

export function bestScore(sessions: SessionRecord[], exercise: ExerciseId) {
  const list = sessions.filter((s) => s.exercise === exercise);
  return list.length ? Math.max(...list.map((s) => s.score)) : null;
}

/** Skills are derived from score components so they reflect exactly what was measured. */
export const SKILLS = [
  { id: "timing", label: "Timing accuracy", exercise: "tempo-maintain", component: "timing" },
  { id: "consistency", label: "Rhythmic consistency", exercise: "tempo-maintain", component: "consistency" },
  { id: "perception", label: "Tempo perception", exercise: "tempo-guess", component: "estimation" },
  { id: "finger-accuracy", label: "Finger accuracy", exercise: "fingers", component: "accuracy" },
  { id: "finger-speed", label: "Finger reaction speed", exercise: "fingers", component: "speed" },
  { id: "note-accuracy", label: "Note accuracy", exercise: "notes", component: "accuracy" },
  { id: "intonation", label: "Intonation", exercise: "notes", component: "intonation" },
  { id: "fretboard-accuracy", label: "Fretboard recall", exercise: "fretboard", component: "accuracy" },
  { id: "fretboard-speed", label: "Fretboard speed", exercise: "fretboard", component: "speed" },
  { id: "voice-accuracy", label: "Vocal pitch match", exercise: "voice-match", component: "accuracy" },
  { id: "voice-intonation", label: "Vocal intonation", exercise: "voice-match", component: "intonation" },
] as const satisfies readonly { id: string; label: string; exercise: ExerciseId; component: string }[];

export function skillLevels(sessions: SessionRecord[], window = 10) {
  return SKILLS.map((skill) => {
    const recent = sessions.filter((s) => s.exercise === skill.exercise).slice(-window);
    const values = recent
      .map((s) => s.breakdown.find((c) => c.id === skill.component)?.value)
      .filter((v): v is number => v != null);
    return { ...skill, value: values.length ? mean(values) : null, samples: values.length };
  });
}

export function recommendNext(sessions: SessionRecord[]): { exercise: ExerciseId; reason: string } {
  const order: ExerciseId[] = ["fingers", "tempo-maintain", "fretboard", "notes", "voice-match", "tempo-guess"];
  const untried = order.find((e) => !sessions.some((s) => s.exercise === e));
  if (untried) {
    return {
      exercise: untried,
      reason: sessions.length === 0 ? "A quick, keyboard-only session to set your baseline." : "You haven't tried this exercise yet. Set a baseline.",
    };
  }
  const ranked = order
    .map((exercise) => {
      const list = sessions.filter((s) => s.exercise === exercise);
      const recent = list.slice(-5);
      return {
        exercise,
        avg: mean(recent.map((s) => s.score)),
        last: new Date(list[list.length - 1].startedAt).getTime(),
      };
    })
    .sort((a, b) => a.avg - b.avg || a.last - b.last);
  const pick = ranked[0];
  return {
    exercise: pick.exercise,
    reason: `Your weakest area right now: recent average ${Math.round(pick.avg)}. Focused practice here gives the biggest gain.`,
  };
}
