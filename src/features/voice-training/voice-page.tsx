"use client";

import { useMemo, useState } from "react";
import { Lock, Mic2, Play } from "lucide-react";
import { PageHeader } from "@/components/training/page-header";
import { TrainingAtmosphere } from "@/components/training/training-atmosphere";
import { TierSelector } from "@/components/training/tier-selector";
import { Button } from "@/components/ui/button";
import { Badge, Skeleton } from "@/components/ui/controls";
import { Card, CardBody } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { bestScoreForTier, TIER_NAMES, tierProgress } from "@/features/gamification/tiers";
import { computeStreak } from "@/features/gamification/stats";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { cn, formatPercent } from "@/lib/utils";
import type { Tier } from "@/types";
import { midiLabel } from "./theory";
import {
  highestVoiceTier,
  isModeUnlocked,
  recommendVoiceMode,
  unlockHint,
  unlockedModes,
  voiceOverview,
} from "./progression";
import { GuidedVoiceSession } from "./sessions/guided-sessions";
import { MatchSession } from "./sessions/match-session";
import {
  VOICE_MODE_BLURB,
  VOICE_MODE_LABEL,
  VOICE_MODES,
  type VoiceMode,
} from "./types";

export function VoicePage() {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.sessions);
  const voiceProgress = useAppStore((s) => s.voiceProgress);
  const lastTier = useAppStore((s) => s.lastTier["voice-match"] ?? 0);
  const unlockedTier = highestVoiceTier(sessions);
  const progressInfo = tierProgress(sessions, "voice");
  const bestByTier = bestScoreForTier(sessions, "voice-match");

  const [tier, setTier] = useState<Tier>(Math.min(lastTier, unlockedTier) as Tier);
  const [mode, setMode] = useState<VoiceMode | null>(null);

  const overview = useMemo(() => voiceOverview(sessions, voiceProgress), [sessions, voiceProgress]);
  const streak = hydrated ? computeStreak(sessions.filter((s) => s.category === "voice")) : 0;
  const rec = recommendVoiceMode(voiceProgress);
  const unlocked = unlockedModes(voiceProgress);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (mode === "match") {
    return (
      <div className="mx-auto max-w-3xl">
        <MatchSession tier={tier} onExit={() => setMode(null)} />
      </div>
    );
  }

  if (mode) {
    return (
      <div className="mx-auto max-w-3xl">
        <GuidedVoiceSession mode={mode} tier={tier} onExit={() => setMode(null)} />
      </div>
    );
  }

  return (
    <TrainingAtmosphere tone="blue" className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Voice · Pitch"
        title="Voice Training"
        description="Treat your voice as an instrument — pitch matching, gentle range mapping, intervals, scales, stability, warm-ups, and melodic memory."
      />

      <Card className="mb-6">
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-medium">Voice overview</h2>
              <p className="mt-1 text-[13px] text-muted">
                Practice comfortably. Never force high or low notes. Detection is for learning — not vocal health advice.
              </p>
            </div>
            <Badge tone="accent">{TIER_NAMES[tier]}</Badge>
          </div>

          <TierSelector
            value={tier}
            unlocked={unlockedTier}
            onChange={setTier}
            bestByTier={bestByTier}
            progress={progressInfo}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Sessions" value={String(overview.sessions)} />
            <Stat label="Pitch accuracy" value={formatPercent(overview.pitchAccuracy)} />
            <Stat label="Stability" value={formatPercent(overview.pitchStability)} />
            <Stat label="Voice streak" value={`${streak}d`} />
            <Stat
              label="Comfortable range"
              value={
                overview.low != null && overview.high != null
                  ? `${midiLabel(overview.low)}–${midiLabel(overview.high)}`
                  : "Not mapped"
              }
            />
            <Stat label="Intervals" value={formatPercent(overview.intervalAccuracy)} />
            <Stat label="Modes unlocked" value={`${unlocked.length}/${VOICE_MODES.length}`} />
            <Stat label="Suggested" value={VOICE_MODE_LABEL[rec.mode]} />
          </div>

          <div className="rounded-[12px] border border-line bg-elevated/40 px-4 py-3 text-[13px] text-muted">
            {rec.reason}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {VOICE_MODES.map((m) => {
              const open = isModeUnlocked(voiceProgress, m);
              const stats = voiceProgress.modes[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    if (!open) {
                      toast(unlockHint(m));
                      return;
                    }
                    setMode(m);
                  }}
                  className={cn(
                    "rounded-[14px] border p-4 text-left transition-colors",
                    open ? "border-line hover:border-line-strong hover:bg-elevated/40" : "cursor-not-allowed border-line opacity-70",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mic2 className="size-4 text-accent" />
                      <span className="text-[14px] font-medium">{VOICE_MODE_LABEL[m]}</span>
                    </div>
                    {!open ? <Lock className="size-3.5 text-subtle" /> : <Play className="size-3.5 text-muted" />}
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">{VOICE_MODE_BLURB[m]}</p>
                  {stats && (
                    <p className="mt-2 text-[11px] text-subtle">
                      {stats.sessions} sessions · best {Math.round(stats.bestScore)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <Button variant="primary" size="lg" onClick={() => setMode(rec.mode)}>
            <Play className="size-4" />
            Start recommended · {VOICE_MODE_LABEL[rec.mode]}
          </Button>
        </CardBody>
      </Card>
    </TrainingAtmosphere>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-bg/60 px-3 py-2.5">
      <div className="text-[11px] text-subtle">{label}</div>
      <div className="mt-0.5 truncate text-[14px] font-medium tabular">{value}</div>
    </div>
  );
}
