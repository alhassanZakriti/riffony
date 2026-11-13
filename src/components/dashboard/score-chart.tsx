"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/features/gamification/stats";
import { chartColors, chartTooltipStyle } from "@/components/charts/theme";

export function ScoreChart({ data }: { data: DailyPoint[] }) {
  const hasData = data.some((d) => d.score != null);
  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[12px] border border-dashed border-line text-[13px] text-muted">
        Complete a few sessions to see your score trend.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis domain={[0, 100]} tick={{ fill: chartColors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: chartColors.muted }} />
          <Line type="monotone" dataKey="tempo" name="Tempo" stroke={chartColors.tempo} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="fingers" name="Fingers" stroke={chartColors.fingers} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="notes" name="Notes" stroke={chartColors.notes} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="fretboard" name="Fretboard" stroke={chartColors.fretboard} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="voice" name="Voice" stroke={chartColors.voice} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
