"use client";

import { useEffect, useState } from "react";
import { OnboardingCard } from "@/components/training/onboarding";
import { TrainingAtmosphere } from "@/components/training/training-atmosphere";
import { Skeleton } from "@/components/ui/controls";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAppStore } from "@/lib/store";
import { NoteSession } from "./note-session";

export function NotesPage() {
  const hydrated = useHydrated();
  const onboarded = useAppStore((s) => s.onboarded.notes);
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
          title="Note Recognition"
          steps={[
            "The app plays or shows a target note. Play that same pitch on your instrument.",
            "Microphone access is used only for local pitch detection — audio never leaves your device.",
            "Calibrate the noise floor in a quiet moment so soft notes aren’t ignored and room noise isn’t counted.",
            "Start with natural notes in one octave. Higher tiers add chromatic notes, wider range, and ear-only prompts.",
          ]}
          onContinue={() => {
            setOnboarded("notes", true);
            setShowIntro(false);
          }}
          onSkip={() => {
            setOnboarded("notes", true);
            setShowIntro(false);
          }}
        />
      </div>
    );
  }

  return (
    <TrainingAtmosphere tone="cyan">
      <NoteSession />
    </TrainingAtmosphere>
  );
}
