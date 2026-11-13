"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors, chartTooltipStyle } from "@/components/charts/theme";
import type { TempoAnalysis } from "@/lib/scoring/tempo";
import { round } from "@/lib/utils";

export function TimingDeviationChart({ analysis }: { analysis: TempoAnalysis }) {
  const points = analysis.hits.map((h) => ({
    beat: h.expectedIndex + 1,
    deviation: round(h.deviation, 1),
    grade: h.grade,
  }));

  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-[12px] border border-dashed border-line text-[13px] text-muted">
        No timed hits to chart.
      </div>
    );
  }

  const early = analysis.hits.filter((h) => h.deviation < 0).length;
  const late = analysis.hits.filter((h) => h.deviation > 0).length;
  const onTime = analysis.hits.filter((h) => h.grade === "perfect" || h.grade === "great").length;

  return (
    <div className="space-y-3">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="beat"
              name="Beat"
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              label={{ value: "Beat", position: "insideBottom", offset: -2, fill: chartColors.axis, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="deviation"
              name="ms"
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{ value: "ms (− early / + late)", angle: -90, position: "insideLeft", fill: chartColors.axis, fontSize: 10 }}
            />
            <ReferenceLine y={0} stroke={chartColors.muted} strokeDasharray="4 4" />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${value} ms`, "Deviation"]}
              labelFormatter={(label) => `Beat ${label}`}
            />
            <Scatter data={points} fill={chartColors.accent} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
        <Stat label="Avg deviation" value={`${round(analysis.meanSignedDeviation)} ms`} />
        <Stat label="Avg |error|" value={`${round(analysis.meanAbsDeviation)} ms`} />
        <Stat label="Early / late" value={`${early} / ${late}`} />
        <Stat label="In window" value={`${onTime}/${analysis.hits.length}`} />
        <Stat label="Missed" value={String(analysis.missed)} />
        <Stat label="Extra" value={String(analysis.extra)} />
        <Stat
          label="% early"
          value={analysis.hits.length ? `${Math.round((early / analysis.hits.length) * 100)}%` : "—"}
        />
        <Stat
          label="% late"
          value={analysis.hits.length ? `${Math.round((late / analysis.hits.length) * 100)}%` : "—"}
        />
      </div>
      <p className="text-[11px] text-subtle">
        Negative = early (rushing). Positive = late (dragging). Zero is exact on the beat.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-elevated/40 px-2.5 py-2">
      <div className="text-muted">{label}</div>
      <div className="tabular mt-0.5 font-medium text-fg">{value}</div>
    </div>
  );
}

/** Compact live cue from signed deviation (ms). */
export function timingCue(deviationMs: number | null): { label: string; tone: string } | null {
  if (deviationMs == null || !Number.isFinite(deviationMs)) return null;
  const abs = Math.abs(deviationMs);
  if (abs <= 25) return { label: "On time", tone: "text-success" };
  if (deviationMs < 0) return { label: abs <= 50 ? "Slightly early" : "Early", tone: "text-warning" };
  return { label: abs <= 50 ? "Slightly late" : "Late", tone: "text-warning" };
}
