"use client";

import { useEffect, useRef } from "react";

/**
 * Listens for physical key presses via KeyboardEvent.code (layout-stable).
 * Ignores auto-repeat and editable targets. Uses a ref for the handler so
 * listeners are not re-bound every render.
 */
export function useKeyPress(onPress: (code: string, event: KeyboardEvent) => void, enabled = true) {
  const handler = useRef(onPress);
  handler.current = onPress;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
        return;
      }
      handler.current(e.code, e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
