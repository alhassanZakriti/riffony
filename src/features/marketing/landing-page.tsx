import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Flame,
  Guitar,
  Hand,
  Mic2,
  Music2,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { BILLING } from "@/lib/product/billing";
import { BRAND } from "@/lib/product/brand";
import { DailyPuzzleTeaser } from "@/features/daily-puzzle/daily-puzzle-teaser";
import { HeroPreview } from "./hero-preview";
import { PricingSection } from "./pricing-section";

const FEATURES = [
  {
    href: "/tempo",
    icon: Timer,
    title: "Tempo Training",
    blurb: "Develop a stronger internal clock — maintain rhythm in silence and estimate BPM with precision.",
    accent: "text-orange border-orange/25 bg-orange/10",
  },
  {
    href: "/fingers",
    icon: Hand,
    title: "Finger Coordination",
    blurb: "Build independence and reaction speed with progressive PIMA drills and configurable visual assistance.",
    accent: "text-accent border-accent/25 bg-accent/10",
  },
  {
    href: "/notes",
    icon: Music2,
    title: "Note Recognition",
    blurb: "Train rapid pitch recognition with microphone or MIDI input and measurable reaction times.",
    accent: "text-cyan border-cyan/25 bg-cyan/10",
  },
  {
    href: "/voice",
    icon: Mic2,
    title: "Voice Training",
    blurb: "Match pitch, intervals, and scales with live vocal feedback and stability scoring.",
    accent: "text-blue border-blue/25 bg-blue/10",
  },
  {
    href: "/fretboard",
    icon: Guitar,
    title: "Fretboard Learning",
    blurb: "Master the neck through active recall — identify, locate, and map notes with spaced repetition.",
    accent: "text-accent-2 border-accent/25 bg-accent/10",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Choose Your Training",
    blurb: "Pick the musical skill you want to sharpen — tempo, fingers, notes, voice, or fretboard.",
  },
  {
    n: "02",
    title: "Practice and Improve",
    blurb: "Run focused sessions with real-time feedback, fair difficulty unlocks, and clear scoring.",
  },
  {
    n: "03",
    title: "Track Your Progress",
    blurb: "Watch accuracy, timing consistency, XP, streaks, and achievements compound over time.",
  },
] as const;

export function LandingPage() {
  const trialHref = BILLING.earlyAccess.href;

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_55%),radial-gradient(ellipse_at_85%_30%,color-mix(in_srgb,var(--cyan)_10%,transparent),transparent_40%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-28">
          <div>
            <BrandLockup height={36} />
            <h1 className="mt-6 max-w-xl font-display text-[44px] font-semibold leading-[1.02] tracking-tight sm:text-[56px] lg:text-[60px]">
              Train Your Musical Reflexes.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
              A cinematic practice studio for timing, pitch, coordination, and fretboard fluency — measured, scored, and
              built to feel alive every time you open it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={trialHref} variant="primary" size="lg">
                Start Your Free Trial
                <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/daily-puzzle" variant="secondary" size="lg">
                Try Today’s Puzzle
              </ButtonLink>
            </div>
            <p className="mt-4 text-[12px] text-subtle">
              No payment required during early access · Progress saved on this device
            </p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section id="daily-puzzle" className="scroll-mt-24 border-y border-line/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-coral">Daily event</p>
            <h2 className="mt-3 font-display text-[34px] font-semibold tracking-tight sm:text-[42px]">
              One shared challenge. Every day.
            </h2>
            <p className="mt-3 text-[15px] text-muted">
              Every visitor gets the same UTC daily puzzle — short, skill-focused, and worth coming back for.
            </p>
          </div>
          <Suspense fallback={<div className="h-56 animate-pulse rounded-[24px] border border-line bg-elevated/30" />}>
            <DailyPuzzleTeaser />
          </Suspense>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Features</p>
            <h2 className="mt-3 font-display text-[34px] font-semibold tracking-tight sm:text-[42px]">
              Training modules with distinct musical identities
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="group relative overflow-hidden rounded-[20px] border border-line/80 bg-surface/60 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-elevated/40"
              >
                <div className={`flex size-11 items-center justify-center rounded-[14px] border ${f.accent}`}>
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-display text-[22px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-fg/80 group-hover:text-fg">
                  Open module <ArrowRight className="size-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-line/70 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cyan">How it works</p>
            <h2 className="mt-3 font-display text-[34px] font-semibold tracking-tight sm:text-[42px]">
              Three steps to sharper musical reflexes
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative pt-2">
                <div className="font-display text-[40px] font-semibold leading-none text-accent/35">{s.n}</div>
                <h3 className="mt-4 text-[18px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.blurb}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lime">Progress system</p>
              <h2 className="mt-3 font-display text-[34px] font-semibold tracking-tight sm:text-[42px]">
                XP, streaks, and skill history that keep you honest
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Levels unlock through real accuracy — not vanity metrics. Your dashboard tracks consistency so practice
                compounds.
              </p>
              <ul className="mt-6 space-y-3 text-[14px] text-muted">
                <li className="flex gap-2">
                  <Sparkles className="mt-0.5 size-4 text-accent" /> XP and levels from scored sessions
                </li>
                <li className="flex gap-2">
                  <Flame className="mt-0.5 size-4 text-orange" /> Daily puzzle and practice streaks
                </li>
                <li className="flex gap-2">
                  <Trophy className="mt-0.5 size-4 text-lime" /> Achievements for milestones
                </li>
                <li className="flex gap-2">
                  <Target className="mt-0.5 size-4 text-cyan" /> Accuracy, reaction, and timing analytics
                </li>
              </ul>
            </div>
            <div
              className="rounded-[24px] border border-line/80 bg-surface/70 p-5 sm:p-6 glow-ring"
              aria-label="Illustrative dashboard preview"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="font-display text-[16px] font-semibold">Overview preview</div>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] text-subtle">Illustrative</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Level", "12"],
                  ["XP", "4,280"],
                  ["Streak", "9"],
                  ["Accuracy", "91%"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[14px] border border-line/80 bg-bg/60 px-3 py-3">
                    <div className="text-[11px] text-subtle">{k}</div>
                    <div className="mt-1 tabular font-display text-[18px] font-semibold">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-28 rounded-[14px] border border-dashed border-line bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--accent)_18%,transparent),color-mix(in_srgb,var(--cyan)_12%,transparent),transparent)]" />
              <p className="mt-3 text-[12px] text-subtle">Sample layout — your real numbers appear after you train.</p>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="border-y border-line/70 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-[30px] font-semibold tracking-tight sm:text-[36px]">
            Built for serious practice, not empty gamification
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            {BRAND.name} scores timing deviation in milliseconds, hides answers until you commit, and unlocks
            difficulty from real accuracy thresholds. When community testimonials are available, they’ll appear here —
            we don’t invent them.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-[40px] font-semibold tracking-tight sm:text-[48px]">
            Your Musical Progress Starts Today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-muted">
            Build better timing, faster recognition, and stronger musical coordination — one session at a time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={trialHref} variant="primary" size="lg">
              Start Your Free Trial
            </ButtonLink>
            <ButtonLink href="/daily-puzzle" variant="secondary" size="lg">
              Play Today’s Puzzle
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
