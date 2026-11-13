"use client";

import { useEffect, useState } from "react";
import { OnboardingCard } from "@/components/training/onboarding";
import { TrainingAtmosphere } from "@/components/training/training-atmosphere";
import { Kbd, Skeleton } from "@/components/ui/controls";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { FingerSession } from "./finger-session";

export function FingersPage() {
  const hydrated = useHydrated();
  const onboarded = useAppStore((s) => s.onboarded.fingers);
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
          title="Finger Coordination (PIMA)"
          steps={[
            <>
              Left hand: <Kbd size="sm">W</Kbd> <Kbd size="sm">E</Kbd> <Kbd size="sm">R</Kbd> <Kbd size="sm">T</Kbd>{" "}
              + <Kbd size="sm">Space</Kbd> (thumb)
            </>,
            <>
              Right hand: <Kbd size="sm">U</Kbd> <Kbd size="sm">I</Kbd> <Kbd size="sm">O</Kbd> <Kbd size="sm">P</Kbd>{" "}
              + <Kbd size="sm">Space</Kbd> (thumb)
            </>,
            "When a finger lights up, press its key. Speed only counts on correct answers.",
            "Space is shared — look at which hand is highlighted to know which thumb is intended.",
          ]}
          onContinue={() => {
            setOnboarded("fingers", true);
            setShowIntro(false);
          }}
          onSkip={() => {
            setOnboarded("fingers", true);
            setShowIntro(false);
          }}
        />
      </div>
    );
  }

  return (
    <TrainingAtmosphere tone="violet">
      <FingerSession />
    </TrainingAtmosphere>
  );
}
