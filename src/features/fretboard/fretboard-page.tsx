"use client";

import { useEffect, useState } from "react";
import { OnboardingCard } from "@/components/training/onboarding";
import { TrainingAtmosphere } from "@/components/training/training-atmosphere";
import { Skeleton } from "@/components/ui/controls";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { FretboardSession } from "./fretboard-session";

export function FretboardPage() {
  const hydrated = useHydrated();
  const onboarded = useAppStore((s) => s.onboarded.fretboard);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (hydrated) setShowIntro(!onboarded);
  }, [hydrated, onboarded]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <OnboardingCard
          title="Learn Fretboard"
          steps={[
            "Active recall first: identify or find notes before answers are revealed.",
            "Spaced repetition tracks every string/fret so weak spots return more often.",
            "Stages unlock from mastery — not from completing a fixed number of sessions.",
            "Octave shapes are a helper, not a substitute for knowing each note by name.",
          ]}
          onContinue={() => {
            setOnboarded("fretboard", true);
            setShowIntro(false);
          }}
          onSkip={() => {
            setOnboarded("fretboard", true);
            setShowIntro(false);
          }}
        />
      </div>
    );
  }

  return (
    <TrainingAtmosphere tone="violet">
      <FretboardSession />
    </TrainingAtmosphere>
  );
}
