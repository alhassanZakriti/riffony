"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandWordmark } from "@/components/brand/logo";
import { ProgressBar } from "@/components/ui/controls";
import { levelFromXp } from "@/features/gamification/xp";
import { totalXp, useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);
  const sessions = useAppStore((s) => s.sessions);
  const dailyPuzzleAttempts = useAppStore((s) => s.dailyPuzzleAttempts);
  const { level, progress, intoLevel, levelSpan } = levelFromXp(totalXp(sessions, dailyPuzzleAttempts));

  return (
    <aside
      className={cn(
        "hidden md:flex h-dvh sticky top-0 shrink-0 flex-col border-r border-line/80 bg-surface/70 backdrop-blur-xl transition-[width] duration-200",
        collapsed ? "w-[88px]" : "w-[252px]",
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-line/80 px-3 py-4",
          collapsed ? "flex-col gap-2" : "gap-2",
        )}
      >
        <Link
          href="/app"
          className={cn("flex items-center overflow-visible", collapsed ? "justify-center" : "min-w-0 flex-1")}
          aria-label="RIFFONY overview"
        >
          <BrandWordmark collapsed={collapsed} />
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="hidden lg:inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-elevated hover:text-fg"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-2.5" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.match(pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-accent/12 text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
                        : "text-muted hover:bg-elevated/70 hover:text-fg",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active ? "text-accent" : "text-subtle group-hover:text-fg",
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-line/80 p-3", collapsed && "px-2")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5 py-1" title={`Level ${level}`}>
            <span className="tabular text-[12px] font-semibold text-fg">{level}</span>
            <ProgressBar value={progress} label="XP progress" className="w-8" />
          </div>
        ) : (
          <div className="rounded-[14px] border border-line/80 bg-elevated/50 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium text-muted">Level {level}</span>
              <span className="tabular text-[12px] text-subtle">
                {intoLevel}/{levelSpan} XP
              </span>
            </div>
            <ProgressBar value={progress} label="XP progress" className="mt-2" />
          </div>
        )}
      </div>
    </aside>
  );
}
