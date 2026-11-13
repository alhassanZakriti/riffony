"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/training/page-header";
import { chartColors, chartTooltipStyle } from "@/components/charts/theme";
import { Button } from "@/components/ui/button";
import { Badge, ProgressBar, Skeleton } from "@/components/ui/controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  EXERCISE_LABEL,
  bestScore,
  computeStreak,
  dailySeries,
  longestStreak,
  overview,
  skillLevels,
} from "@/features/gamification/stats";
import { ACHIEVEMENT_BY_ID } from "@/features/gamification/achievements";
import { useHydrated } from "@/hooks/use-hydrated";
import { toast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { formatDuration, formatMs, formatPercent, round } from "@/lib/utils";
import type { ExerciseId } from "@/types";

export function ProgressPage() {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.sessions);
  const achievements = useAppStore((s) => s.achievements);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const restoreSession = useAppStore((s) => s.restoreSession);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const stats = overview(sessions);
  const series = dailySeries(sessions, 30);
  const skills = skillLevels(sessions).sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const strong = skills.filter((s) => s.value != null).slice(0, 3);
  const weak = [...skills].filter((s) => s.value != null).reverse().slice(0, 3);

  const accuracySeries = sessions
    .filter((s) => s.exercise !== "tempo-guess")
    .slice(-40)
    .map((s, i) => ({ i: i + 1, accuracy: round(s.accuracy * 100, 1), label: EXERCISE_LABEL[s.exercise] }));

  const reactionSeries = sessions
    .filter((s) => s.avgReactionMs != null && s.category !== "tempo")
    .slice(-40)
    .map((s, i) => ({ i: i + 1, ms: Math.round(s.avgReactionMs!), label: EXERCISE_LABEL[s.exercise] }));

  const consistencySeries = sessions
    .filter((s) => s.exercise === "tempo-maintain" && s.stats.intervalCv != null)
    .slice(-30)
    .map((s, i) => ({ i: i + 1, cv: round((s.stats.intervalCv as number) * 100, 2) }));

  const frequency = series.map((d) => ({ label: d.label, minutes: d.minutes, sessions: d.sessions }));

  const records: { exercise: ExerciseId; score: number | null }[] = (
    ["tempo-maintain", "tempo-guess", "fingers", "notes", "fretboard"] as ExerciseId[]
  ).map((exercise) => ({ exercise, score: bestScore(sessions, exercise) }));

  const unlockedAchievements = Object.entries(achievements)
    .map(([id, at]) => ({ id, at, def: ACHIEVEMENT_BY_ID[id] }))
    .filter((a) => a.def)
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Progress · Analytics"
        title="Statistics"
        description="Real session history stored on this device — scores, consistency, and personal records."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Sessions" value={stats.sessions} tone="violet" />
        <StatTile label="Total time" value={formatDuration(stats.totalMs)} tone="cyan" />
        <StatTile
          label="Current streak"
          value={`${computeStreak(sessions)} d`}
          hint={`Longest ${longestStreak(sessions)} d`}
          tone="orange"
        />
        <StatTile
          label="Accuracy"
          value={formatPercent(stats.accuracy)}
          hint={`Reaction ${formatMs(stats.avgReactionMs)}`}
          tone="lime"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Score evolution" description="Daily averages by category (30 days)." />
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis domain={[0, 100]} tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="tempo" name="Tempo" stroke={chartColors.tempo} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="fingers" name="Fingers" stroke={chartColors.fingers} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="notes" name="Notes" stroke={chartColors.notes} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="fretboard" name="Fretboard" stroke={chartColors.warning} strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Training frequency" description="Minutes practiced per day." />
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequency}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="minutes" name="Minutes" fill={chartColors.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Accuracy over time" description="Recent non-guess sessions." />
          <CardBody>
            <div className="h-52">
              {accuracySeries.length < 2 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracySeries}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="i" tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke={chartColors.success} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Reaction time" description="Fingers & notes averages (lower is better)." />
          <CardBody>
            <div className="h-52">
              {reactionSeries.length < 2 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reactionSeries}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="i" tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line type="monotone" dataKey="ms" name="ms" stroke={chartColors.warning} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tempo consistency" description="Interval CV% from Maintain the Tempo (lower is steadier)." />
          <CardBody>
            <div className="h-52">
              {consistencySeries.length < 2 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={consistencySeries}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="i" tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line type="monotone" dataKey="cv" name="CV %" stroke={chartColors.tempo} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Skills" description="Derived from recent score components." />
          <CardBody className="space-y-4">
            <div>
              <h3 className="mb-2 text-[13px] font-medium text-success">Strongest</h3>
              {strong.length === 0 ? (
                <p className="text-[13px] text-muted">Train to unlock skill rankings.</p>
              ) : (
                strong.map((s) => (
                  <SkillRow key={s.id} label={s.label} value={s.value!} />
                ))
              )}
            </div>
            <div>
              <h3 className="mb-2 text-[13px] font-medium text-warning">Needs work</h3>
              {weak.length === 0 ? (
                <p className="text-[13px] text-muted">Not enough data yet.</p>
              ) : (
                weak.map((s) => <SkillRow key={s.id} label={s.label} value={s.value!} />)
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal records" />
          <CardBody className="space-y-2">
            {records.map((r) => (
              <div key={r.exercise} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5 text-[13px]">
                <span className="text-muted">{EXERCISE_LABEL[r.exercise]}</span>
                <span className="tabular text-[16px] font-semibold">{r.score ?? "—"}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={<span id="achievements">Achievements</span>}
            description={`${unlockedAchievements.length} unlocked`}
          />
          <CardBody className="max-h-72 space-y-2 overflow-y-auto">
            {unlockedAchievements.length === 0 ? (
              <p className="text-[13px] text-muted">Complete sessions to earn achievements.</p>
            ) : (
              unlockedAchievements.map((a) => (
                <div key={a.id} className="rounded-[10px] border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{a.def.title}</span>
                    <Badge tone="accent">+{a.def.xp}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted">{a.def.description}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Session history" description="Newest first. Deleting a session can be undone." />
        <CardBody className="pt-0">
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted">No history yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...sessions].reverse().map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-fg">{EXERCISE_LABEL[s.exercise]}</div>
                    <div className="truncate text-muted">
                      {new Date(s.startedAt).toLocaleString()} · {s.configLabel} · avg{" "}
                      {s.exercise === "tempo-maintain"
                        ? `${round(Number(s.stats.meanAbsDeviation ?? 0))} ms`
                        : formatMs(s.avgReactionMs)}
                    </div>
                  </div>
                  <span className="tabular text-[15px] font-semibold">{s.score}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete session"
                    onClick={() => {
                      const removed = deleteSession(s.id);
                      if (!removed) return;
                      toast("Session removed", {
                        label: "Undo",
                        onClick: () => restoreSession(removed),
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function SkillRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2 space-y-1">
      <div className="flex justify-between text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="tabular text-fg">{Math.round(value * 100)}</span>
      </div>
      <ProgressBar value={value} label={label} tone="fg" />
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-[12px] border border-dashed border-line text-[13px] text-muted">
      Not enough data yet.
    </div>
  );
}
