"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/** Hides app navigation while an exercise is active. */
export function useFocusMode(active: boolean) {
  const setFocusMode = useAppStore((s) => s.setFocusMode);
  useEffect(() => {
    setFocusMode(active);
    return () => setFocusMode(false);
  }, [active, setFocusMode]);
}
