"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { signInWithEmail, type AuthFormState } from "@/features/auth/actions";
import { SocialButtons } from "@/features/auth/social-buttons";

export function LoginForm({
  callbackUrl = "/app",
  googleEnabled = false,
}: {
  callbackUrl?: string;
  googleEnabled?: boolean;
}) {
  const [state, action, pending] = useActionState(signInWithEmail, null as AuthFormState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Sign in</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Access your saved training progress, XP, and daily puzzle history.
        </p>
      </div>

      <SocialButtons callbackUrl={callbackUrl} googleEnabled={googleEnabled} />

      <div className="flex items-center gap-3 text-[12px] text-subtle">
        <div className="h-px flex-1 bg-line" />
        or email
        <div className="h-px flex-1 bg-line" />
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="block space-y-2">
          <span className="text-[12px] text-muted">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 w-full rounded-[12px] border border-line bg-bg px-3 text-[14px] outline-none focus-visible:border-accent"
            placeholder="you@email.com"
          />
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-muted" htmlFor="password">
              Password
            </label>
            <ButtonLink href="/forgot-password" variant="ghost" size="sm" className="h-auto px-0 text-[12px]">
              Forgot password?
            </ButtonLink>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-[12px] border border-line bg-bg px-3 pr-11 text-[14px] outline-none focus-visible:border-accent"
              placeholder="Your password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-2 text-muted hover:text-fg"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {state?.error && (
          <p className="rounded-[12px] border border-error/30 bg-error/10 px-3 py-2 text-[13px] text-error">
            {state.error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-[13px] text-subtle">
        New here?{" "}
        <ButtonLink
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          variant="ghost"
          size="sm"
          className="inline h-auto px-1"
        >
          Create an account
        </ButtonLink>
      </p>
      <ButtonLink href="/daily-puzzle" variant="ghost" className="w-full">
        Play today’s puzzle as a guest
      </ButtonLink>
    </div>
  );
}
