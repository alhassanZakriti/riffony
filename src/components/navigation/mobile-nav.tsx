"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/brand/logo";
import { BRAND } from "@/lib/product/brand";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

const MOBILE_TABS = NAV_ITEMS.filter((i) =>
  ["/app", "/tempo", "/fingers", "/notes", "/voice"].includes(i.href),
);

export function MobileTopBar() {
  return (
    <header className="flex md:hidden items-center justify-between border-b border-line/80 bg-surface/80 px-4 py-3 backdrop-blur-xl">
      <Link href="/app" className="flex items-center" aria-label={`${BRAND.name} overview`}>
        <BrandLockup height={18} className="max-w-[10rem]" />
      </Link>
      <Link
        href="/settings"
        className="rounded-[10px] px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-elevated hover:text-fg"
      >
        Settings
      </Link>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 flex md:hidden border-t border-line/80 bg-surface/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      {MOBILE_TABS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
              active ? "text-fg" : "text-muted",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-[10px] transition-colors",
                active && "bg-accent/15",
              )}
            >
              <Icon className={cn("size-4", active && "text-accent")} />
            </span>
            <span>{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
