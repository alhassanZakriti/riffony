"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { BILLING } from "@/lib/product/billing";
import { BRAND } from "@/lib/product/brand";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/daily-puzzle", label: "Daily Puzzle" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const trialHref = BILLING.enabled ? "/register" : BILLING.earlyAccess.href;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="app-mesh min-h-dvh text-fg">
      <header
        className={cn(
          "sticky top-0 z-40 transition-[background,border-color,backdrop-filter] duration-200",
          scrolled || open
            ? "border-b border-line/70 bg-bg/75 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center" onClick={() => setOpen(false)} aria-label={BRAND.name}>
            <BrandLockup height={20} className="max-w-[9.5rem] sm:max-w-none" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-[10px] px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-elevated/70 hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ButtonLink href="/login" variant="ghost" size="sm">
              Sign In
            </ButtonLink>
            <ButtonLink href={trialHref} variant="primary" size="sm">
              Start Free Trial
            </ButtonLink>
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-[12px] border border-line md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-line bg-bg/95 px-4 py-4 backdrop-blur-xl md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-[12px] px-3 py-3 text-[15px] text-fg hover:bg-elevated"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/login" className="rounded-[12px] px-3 py-3 text-[15px] text-muted" onClick={() => setOpen(false)}>
                Sign In
              </Link>
              <ButtonLink href={trialHref} variant="primary" className="mt-2">
                Start Free Trial
              </ButtonLink>
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-line/80 bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center">
              <BrandLockup height={22} />
            </div>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
              Performance training for musicians — timing, coordination, recognition, and fretboard fluency, measured
              session by session.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { href: "/#features", label: "Features" },
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/daily-puzzle", label: "Daily Puzzle" },
              { href: "/app", label: "Open App" },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { href: "/pricing", label: "Pricing" },
              { href: "/login", label: "Sign In" },
              { href: "/register", label: "Start Free Trial" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { href: "/privacy", label: "Privacy Policy" },
              { href: "/terms", label: "Terms of Service" },
              { href: `mailto:${BRAND.contactEmail}`, label: "Contact" },
            ]}
          />
        </div>
        <div className="border-t border-line/80 px-4 py-4 text-center text-[12px] text-subtle sm:px-6">
          © {BRAND.name}. Daily puzzles reset at 00:00 UTC.
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-subtle">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[13px] text-muted transition-colors hover:text-fg">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
