import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/logo";
import { BRAND } from "@/lib/product/brand";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-mesh grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-line/70 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_80%,color-mix(in_srgb,var(--cyan)_16%,transparent),transparent_50%)]" />
        <div className="relative">
          <BrandLockup height={28} />
        </div>
        <div className="relative max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-accent">Cloud progress</p>
          <h1 className="mt-4 font-display text-[42px] font-semibold leading-[1.05] tracking-tight">
            Train anywhere. Keep every gain.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            {BRAND.name} saves your XP, streaks, sessions, and puzzle history to your account — so your musical reflexes
            travel with you.
          </p>
          <AuthWaveform />
        </div>
        <p className="relative text-[12px] text-subtle">Secure email authentication powered by Neon Auth.</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0 lg:hidden bg-[radial-gradient(ellipse_at_50%_-10%,color-mix(in_srgb,var(--accent)_20%,transparent),transparent_55%)]" />
        <div className="relative w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

function AuthWaveform() {
  return (
    <div className="mt-10 flex h-16 items-end gap-1.5" aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => {
        const h = 18 + ((i * 41) % 42);
        return (
          <span
            key={i}
            className="flex-1 rounded-sm bg-accent/50"
            style={{ height: `${h}%`, opacity: 0.35 + (i % 5) * 0.1 }}
          />
        );
      })}
    </div>
  );
}
