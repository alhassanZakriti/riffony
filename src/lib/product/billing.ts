/**
 * Billing & trial configuration.
 * Plans are empty until a payment provider is wired — do not invent prices in the UI.
 */
export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  /** Monthly price in minor currency units (cents). Null = contact / free. */
  monthlyPriceCents: number | null;
  /** Yearly price in minor currency units. Null if yearly not offered. */
  yearlyPriceCents: number | null;
  currency: "USD" | "EUR";
  trialDays: number | null;
  features: PlanFeature[];
  ctaLabel: string;
  /** Where the plan CTA should send the user. */
  href: string;
  highlighted?: boolean;
}

export const BILLING = {
  /** Flip when Stripe (or similar) is connected. */
  enabled: false,
  currency: "USD" as const,
  trial: {
    enabled: true,
    /** Null = open-ended local access while billing is disabled. */
    days: null as number | null,
    requiresPaymentMethod: false,
    accessSummary: "Full training library on this device — tempo, fingers, notes, voice, and fretboard.",
    afterTrial:
      "When paid plans launch, your local progress stays on this device. You’ll choose a plan only if you want cloud sync or premium tiers.",
  },
  plans: [] as SubscriptionPlan[],
  /**
   * Shown when `plans` is empty / billing disabled.
   * Keep honest — no fabricated dollar amounts.
   */
  earlyAccess: {
    title: "Free while in early access",
    description:
      "RIFFLEX currently runs fully in your browser. Create a local profile to save progress, streaks, and daily puzzle results on this device.",
    ctaLabel: "Start Free Training",
    href: "/register",
    bullets: [
      "All core training modules",
      "Daily musical puzzle",
      "XP, levels, and achievements",
      "No payment required today",
    ],
  },
} as const;

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}
