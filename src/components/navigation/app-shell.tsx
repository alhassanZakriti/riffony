"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MobileBottomNav, MobileTopBar } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const focusMode = useAppStore((s) => s.focusMode);

  return (
    <div className="app-mesh flex min-h-dvh">
      {!focusMode && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        {!focusMode && <MobileTopBar />}
        <main
          className={cn(
            "flex-1 min-w-0",
            !focusMode && "px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8",
            focusMode && "px-0 py-0",
          )}
        >
          {children}
        </main>
        {!focusMode && <MobileBottomNav />}
      </div>
    </div>
  );
}
