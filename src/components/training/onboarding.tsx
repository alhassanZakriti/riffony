"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export function OnboardingCard({
  title,
  steps,
  onContinue,
  onSkip,
}: {
  title: string;
  steps: ReactNode[];
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardBody className="space-y-6">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">Quick start</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-muted">
              <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-elevated text-[12px] font-medium text-fg">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="primary" onClick={onContinue}>
            Got it — start training
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            Skip next time
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
