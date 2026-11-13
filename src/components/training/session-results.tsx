"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, ProgressBar } from "@/components/ui/controls";
import { Card, CardBody } from "@/components/ui/card";
import { EXERCISE_LABEL } from "@/features/gamification/stats";
import { TIER_NAMES } from "@/features/gamification/tiers";
import type { Achievement } from "@/features/gamification/achievements";
import type { RecordOutcome } from "@/lib/store";
import { cn, formatMs, formatPercent, round } from "@/lib/utils";

export function SessionResults({
  outcome,
  onRetry,
  dashboardHref = "/",
}: {
  outcome: RecordOutcome;
  onRetry: () => void;
  dashboardHref?: string;
}) {
  const { record, newAchievements, levelBefore, levelAfter } = outcome;
  const leveledUp = levelAfter > levelBefore;
  const beatRecord = record.previousBest != null && record.score > record.previousBest;
  const delta = record.previousBest != null ? round(record.score - record.previousBest, 1) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col justify-center gap-6 px-4 py-10"
    >
      <div className="text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">Session complete</p>
        <h1 className="mt-2 text-[40px] font-semibold tracking-tight tabular text-fg">{record.score}</h1>
        <p className="mt-1 text-[15px] text-muted">
          {EXERCISE_LABEL[record.exercise]} · {TIER_NAMES[record.tier]}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {record.perfect && <Badge tone="success">Perfect</Badge>}
          {beatRecord && <Badge tone="accent">Personal record</Badge>}
          {leveledUp && <Badge tone="warning">Level {levelAfter}</Badge>}
          {delta != null && (
            <Badge tone={delta >= 0 ? "success" : "error"}>
              {delta >= 0 ? "+" : ""}
              {delta} vs best
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Accuracy" value={formatPercent(record.accuracy)} />
        <Metric label="Avg reaction" value={formatMs(record.avgReactionMs)} />
        <Metric label="Best reaction" value={formatMs(record.bestReactionMs)} />
        <Metric label="Errors" value={String(record.errors)} />
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium">Score breakdown</h2>
            <span className="text-[12px] text-muted">{record.configLabel}</span>
          </div>
          {record.breakdown.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-fg">
                  {c.label}
                  <span className="ml-1.5 text-subtle">×{c.weight}</span>
                </span>
                <span className="tabular text-muted">{Math.round(c.value * 100)}</span>
              </div>
              <ProgressBar value={c.value} label={c.label} tone="fg" />
              <p className="text-[12px] leading-relaxed text-subtle">{c.detail}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium">XP earned</h2>
            <span className="tabular text-lg font-semibold text-accent">+{record.xp}</span>
          </div>
          <ul className="space-y-1.5">
            {record.xpBreakdown.map((x) => (
              <li key={x.label} className="flex justify-between text-[13px] text-muted">
                <span>{x.label}</span>
                <span className="tabular">+{x.amount}</span>
              </li>
            ))}
          </ul>
          {leveledUp && (
            <p className="flex items-center gap-2 rounded-[10px] border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
              <Trophy className="size-4" />
              You reached level {levelAfter}.
            </p>
          )}
        </CardBody>
      </Card>

      {newAchievements.length > 0 && <AchievementsList items={newAchievements} />}

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" size="lg" onClick={onRetry}>
          <RotateCcw className="size-4" />
          Retry
        </Button>
        <ButtonLink href={dashboardHref} variant="secondary" size="lg">
          <ArrowLeft className="size-4" />
          Overview
        </ButtonLink>
      </div>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-surface px-3 py-3 text-center">
      <div className="tabular text-[18px] font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

function AchievementsList({ items }: { items: Achievement[] }) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="text-[14px] font-medium">Achievements unlocked</h2>
        {items.map((a) => (
          <div key={a.id} className={cn("rounded-[10px] border border-accent/25 bg-accent/5 px-3 py-2.5")}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[14px] font-medium text-fg">{a.title}</span>
              <span className="tabular text-[12px] text-accent">+{a.xp} XP</span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">{a.description}</p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
