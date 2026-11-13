"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toast";
import { setMasterVolume } from "@/lib/audio/context";
import { useAppStore } from "@/lib/store";

function resolveTheme(pref: "dark" | "light" | "system") {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return pref;
}

function applyChrome(theme: "dark" | "light" | "system", reducedMotion: boolean, volume: number) {
  document.documentElement.dataset.theme = resolveTheme(theme);
  document.documentElement.dataset.reducedMotion = reducedMotion ? "true" : "false";
  setMasterVolume(volume);
}

/** Rehydrates the store and keeps theme / volume / reduced-motion in sync. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (
        state.settings.theme !== prev.settings.theme ||
        state.settings.reducedMotion !== prev.settings.reducedMotion ||
        state.settings.masterVolume !== prev.settings.masterVolume
      ) {
        applyChrome(state.settings.theme, state.settings.reducedMotion, state.settings.masterVolume);
      }
    });

    const applyCurrent = () => {
      const { settings, hydrated } = useAppStore.getState();
      if (!hydrated) return;
      applyChrome(settings.theme, settings.reducedMotion, settings.masterVolume);
    };

    applyCurrent();
    const unsubHydrate = useAppStore.subscribe((s, p) => {
      if (s.hydrated && !p.hydrated) applyCurrent();
    });

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onScheme = () => {
      if (useAppStore.getState().settings.theme === "system") applyCurrent();
    };
    mq.addEventListener("change", onScheme);

    return () => {
      unsub();
      unsubHydrate();
      mq.removeEventListener("change", onScheme);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
