"use client";

import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { BILLING, formatMoney } from "@/lib/product/billing";

export function PricingSection({ id = "pricing" }: { id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent">Pricing</p>
          <h2 className="mt-3 font-display text-[32px] font-semibold tracking-tight sm:text-[40px]">
            Start free. Upgrade when billing launches.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            {BILLING.enabled
              ? "Choose a plan that fits your practice rhythm."
              : BILLING.earlyAccess.description}
          </p>
        </div>

        {!BILLING.enabled || BILLING.plans.length === 0 ? (
          <div className="mx-auto mt-10 max-w-lg rounded-[24px] border border-accent/35 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)] p-6 sm:p-8 glow-ring">
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Free trial</div>
            <h3 className="mt-2 font-display text-[28px] font-semibold">{BILLING.earlyAccess.title}</h3>
            <p className="mt-2 text-[14px] text-muted">{BILLING.trial.accessSummary}</p>
            <ul className="mt-5 space-y-2.5">
              {BILLING.earlyAccess.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[14px] text-fg">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-muted">
              Payment method required: {BILLING.trial.requiresPaymentMethod ? "Yes" : "No"}.
              {BILLING.trial.days == null
                ? " Trial length: open-ended while early access lasts."
                : ` Trial length: ${BILLING.trial.days} days.`}
            </p>
            <p className="mt-2 text-[13px] text-subtle">{BILLING.trial.afterTrial}</p>
            <ButtonLink href={BILLING.earlyAccess.href} variant="primary" size="lg" className="mt-6 w-full sm:w-auto">
              {BILLING.earlyAccess.ctaLabel}
            </ButtonLink>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {BILLING.plans.map((plan) => (
              <div
                key={plan.id}
                className={
                  plan.highlighted
                    ? "rounded-[20px] border border-accent/50 bg-accent/10 p-6"
                    : "rounded-[20px] border border-line bg-surface p-6"
                }
              >
                <h3 className="font-display text-[22px] font-semibold">{plan.name}</h3>
                <p className="mt-1 text-[13px] text-muted">{plan.description}</p>
                <div className="mt-4">
                  {plan.monthlyPriceCents == null ? (
                    <div className="text-[28px] font-semibold">Custom</div>
                  ) : (
                    <>
                      <div className="text-[28px] font-semibold">
                        {formatMoney(plan.monthlyPriceCents, plan.currency)}
                        <span className="text-[14px] font-normal text-muted"> / month</span>
                      </div>
                      {plan.yearlyPriceCents != null && (
                        <div className="text-[13px] text-muted">
                          or {formatMoney(plan.yearlyPriceCents, plan.currency)} / year
                        </div>
                      )}
                    </>
                  )}
                </div>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex gap-2 text-[13px] text-muted">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {f.label}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href={plan.href}
                  variant={plan.highlighted ? "primary" : "secondary"}
                  className="mt-6 w-full"
                >
                  {plan.ctaLabel}
                </ButtonLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
