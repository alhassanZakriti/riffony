"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { useAppStore } from "@/lib/store";

type CloudPayload = {
  settings: unknown;
  sessions: unknown;
  achievements: unknown;
  onboarded: unknown;
  lastTier: unknown;
  sidebarCollapsed: unknown;
  fretboardMastery: unknown;
  noteStringMastery: unknown;
  voiceProgress: unknown;
  dailyPuzzleAttempts: unknown;
  localProfileCreatedAt: unknown;
};

function snapshotFromStore(): CloudPayload {
  const s = useAppStore.getState();
  return {
    settings: s.settings,
    sessions: s.sessions,
    achievements: s.achievements,
    onboarded: s.onboarded,
    lastTier: s.lastTier,
    sidebarCollapsed: s.sidebarCollapsed,
    fretboardMastery: s.fretboardMastery,
    noteStringMastery: s.noteStringMastery,
    voiceProgress: s.voiceProgress,
    dailyPuzzleAttempts: s.dailyPuzzleAttempts,
    localProfileCreatedAt: s.localProfileCreatedAt,
  };
}

/** Pulls cloud progress on sign-in and pushes local changes while authenticated. */
export function CloudSync() {
  const hydrated = useAppStore((s) => s.hydrated);
  const pushedOnce = useRef(false);
  const syncing = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pull = async () => {
      const { data: session } = await authClient.getSession();
      if (!session?.user || cancelled) return;

      if (session.user.name) {
        useAppStore.getState().updateSettings({ displayName: session.user.name });
        if (!useAppStore.getState().localProfileCreatedAt) {
          useAppStore.getState().createLocalProfile(session.user.name);
        }
      }

      const res = await fetch("/api/progress");
      if (!res.ok || cancelled) return;
      const json = (await res.json()) as { payload: CloudPayload | null };
      if (json.payload && typeof json.payload === "object") {
        const local = useAppStore.getState();
        const cloudSessions = Array.isArray(json.payload.sessions) ? json.payload.sessions.length : 0;
        // Prefer cloud when it has more history; otherwise keep local and upload.
        if (cloudSessions >= local.sessions.length) {
          useAppStore.getState().restoreSnapshot({
            settings: { ...local.settings, ...(json.payload.settings as object) },
            sessions: (json.payload.sessions as typeof local.sessions) ?? local.sessions,
            achievements: (json.payload.achievements as typeof local.achievements) ?? local.achievements,
            onboarded: (json.payload.onboarded as typeof local.onboarded) ?? local.onboarded,
            lastTier: (json.payload.lastTier as typeof local.lastTier) ?? local.lastTier,
            sidebarCollapsed: Boolean(json.payload.sidebarCollapsed ?? local.sidebarCollapsed),
            fretboardMastery:
              (json.payload.fretboardMastery as typeof local.fretboardMastery) ?? local.fretboardMastery,
            noteStringMastery:
              (json.payload.noteStringMastery as typeof local.noteStringMastery) ?? local.noteStringMastery,
            voiceProgress: (json.payload.voiceProgress as typeof local.voiceProgress) ?? local.voiceProgress,
            dailyPuzzleAttempts:
              (json.payload.dailyPuzzleAttempts as typeof local.dailyPuzzleAttempts) ?? local.dailyPuzzleAttempts,
            localProfileCreatedAt:
              (json.payload.localProfileCreatedAt as string | null) ?? local.localProfileCreatedAt,
          });
        }
      }

      if (!pushedOnce.current) {
        pushedOnce.current = true;
        await fetch("/api/progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: snapshotFromStore() }),
        });
      }
    };

    const schedulePush = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (syncing.current || cancelled) return;
        const { data: session } = await authClient.getSession();
        if (!session?.user) return;
        syncing.current = true;
        try {
          await fetch("/api/progress", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: snapshotFromStore() }),
          });
        } finally {
          syncing.current = false;
        }
      }, 1200);
    };

    void pull();
    const unsub = useAppStore.subscribe((state, prev) => {
      if (
        state.sessions !== prev.sessions ||
        state.achievements !== prev.achievements ||
        state.dailyPuzzleAttempts !== prev.dailyPuzzleAttempts ||
        state.fretboardMastery !== prev.fretboardMastery ||
        state.noteStringMastery !== prev.noteStringMastery ||
        state.voiceProgress !== prev.voiceProgress ||
        state.settings !== prev.settings
      ) {
        schedulePush();
      }
    });

    return () => {
      cancelled = true;
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [hydrated]);

  return null;
}
