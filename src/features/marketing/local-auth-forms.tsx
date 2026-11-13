"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { BILLING } from "@/lib/product/billing";

export function RegisterForm() {
  const router = useRouter();
  const createLocalProfile = useAppStore((s) => s.createLocalProfile);
  const existing = useAppStore((s) => s.settings.displayName);
  const createdAt = useAppStore((s) => s.localProfileCreatedAt);
  const [name, setName] = useState(existing || "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createLocalProfile(name);
    router.push("/app");
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-5 px-4 py-14 sm:px-6">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent">Free trial</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight">Create your local profile</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Cloud authentication isn’t connected yet. Your profile, progress, and daily puzzle streak stay on this device.
          {BILLING.trial.requiresPaymentMethod
            ? " A payment method will be required when billing launches."
            : " No payment method is required today."}
        </p>
      </div>
      {createdAt && (
        <p className="rounded-[12px] border border-line bg-elevated/50 px-3 py-2 text-[13px] text-muted">
          A profile already exists on this device{existing ? ` (${existing})` : ""}. Updating your name keeps the same
          progress.
        </p>
      )}
      <label className="block space-y-2">
        <span className="text-[12px] text-muted">Display name</span>
        <input
          className="h-11 w-full rounded-[10px] border border-line bg-bg px-3 text-[14px] outline-none focus-visible:border-accent"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder="Musician"
          autoComplete="nickname"
          required
        />
      </label>
      <Button type="submit" variant="primary" size="lg" className="w-full">
        {BILLING.earlyAccess.ctaLabel}
      </Button>
      <p className="text-center text-[13px] text-subtle">
        Already training here?{" "}
        <ButtonLink href="/login" variant="ghost" size="sm" className="inline h-auto px-1">
          Sign in
        </ButtonLink>
      </p>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const displayName = useAppStore((s) => s.settings.displayName);
  const createdAt = useAppStore((s) => s.localProfileCreatedAt);
  const hasProfile = Boolean(createdAt || displayName);

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-14 sm:px-6">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent">Sign in</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight">Continue on this device</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          RIFFONY currently stores progress in your browser. There is no cloud password yet — opening the app on
          this device restores your sessions and daily puzzle history.
        </p>
      </div>
      {hasProfile ? (
        <>
          <div className="rounded-[14px] border border-line bg-surface px-4 py-3 text-[14px]">
            Welcome back{displayName ? `, ${displayName}` : ""}.
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={() => router.push("/app")}>
            Open training
          </Button>
        </>
      ) : (
        <>
          <p className="rounded-[14px] border border-line bg-elevated/40 px-4 py-3 text-[14px] text-muted">
            No local profile found on this browser yet.
          </p>
          <ButtonLink href="/register" variant="primary" size="lg" className="w-full">
            Start Free Trial
          </ButtonLink>
        </>
      )}
      <ButtonLink href="/daily-puzzle" variant="ghost" className="w-full">
        Play today’s puzzle as a guest
      </ButtonLink>
    </div>
  );
}
