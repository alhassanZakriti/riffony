"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

/** True after zustand has rehydrated from localStorage. */
export function useHydrated() {
  const hydrated = useAppStore((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && hydrated;
}
