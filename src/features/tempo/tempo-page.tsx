"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/training/page-header";
import { OnboardingCard } from "@/components/training/onboarding";
import { TrainingAtmosphere } from "@/components/training/training-atmosphere";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/controls";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { GuessTempoSession } from "./guess-session";
import { MaintainTempoSession } from "./maintain-session";

type Exercise = "maintain" | "guess";

export function TempoPage() {
  const hydrated = useHydrated();
  const search = useSearchParams();
  const onboarded = useAppStore((s) => s.onboarded.tempo);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const [exercise, setExercise] = useState<Exercise>("maintain");
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const q = search.get("exercise");
    if (q === "guess" || q === "maintain") setExercise(q);
  }, [search]);

  useEffect(() => {
    if (hydrated) setShowIntro(!onboarded);
  }, [hydrated, onboarded]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <OnboardingCard
          title="Tempo Training"
          steps={[
            "Maintain the Tempo: lock onto a click track and tap every beat as precisely as you can.",
            "Guess the Tempo: listen to a short synthesised groove and estimate its BPM.",
            "Higher tiers unlock after consistent high scores — not just time spent.",
            "Use Space, mouse, touch, or a MIDI keyboard for tapping.",
          ]}
          onContinue={() => {
            setOnboarded("tempo", true);
            setShowIntro(false);
          }}
          onSkip={() => {
            setOnboarded("tempo", true);
            setShowIntro(false);
          }}
        />
      </div>
    );
  }

  const header = (
    <PageHeader
      eyebrow="Tempo · Rhythm"
      title="Tempo Training"
      description="Perceive, reproduce, and estimate tempo with immediate timing feedback."
      action={
        <Segmented
          label="Exercise"
          value={exercise}
          onChange={setExercise}
          options={[
            { value: "maintain", label: "Maintain" },
            { value: "guess", label: "Guess" },
          ]}
        />
      }
    />
  );

  return (
    <TrainingAtmosphere tone="orange">
      {exercise === "maintain" ? (
        <MaintainTempoSession header={header} />
      ) : (
        <GuessTempoSession header={header} />
      )}
    </TrainingAtmosphere>
  );
}
