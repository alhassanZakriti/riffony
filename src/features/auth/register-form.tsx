"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { signUpWithEmail, type AuthFormState } from "@/features/auth/actions";
import { SocialButtons } from "@/features/auth/social-buttons";

export function RegisterForm({
  callbackUrl = "/app",
  googleEnabled = false,
}: {
  callbackUrl?: string;
  googleEnabled?: boolean;
}) {
  const [state, action, pending] = useActionState(signUpWithEmail, null as AuthFormState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Create account</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight">Join RIFFLEX</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Save XP, streaks, and training history to your account across devices.
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
        <Field label="Display name" name="name" autoComplete="name" required placeholder="Your name" />
        <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="you@email.com" />
        <div className="space-y-2">
          <label className="text-[12px] text-muted" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className="h-11 w-full rounded-[12px] border border-line bg-bg px-3 pr-11 text-[14px] outline-none focus-visible:border-accent"
              placeholder="At least 8 characters"
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
        <Field
          label="Confirm password"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <label className="flex items-start gap-2 text-[13px] text-muted">
          <input type="checkbox" name="terms" className="mt-1" required />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-fg underline-offset-2 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-fg underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {state?.error && (
          <p className="rounded-[12px] border border-error/30 bg-error/10 px-3 py-2 text-[13px] text-error">
            {state.error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-[13px] text-subtle">
        Already have an account?{" "}
        <ButtonLink href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} variant="ghost" size="sm" className="inline h-auto px-1">
          Sign in
        </ButtonLink>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: React.ComponentProps<"input"> & { label: string; name: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-[12px] text-muted">{label}</span>
      <input
        name={name}
        type={type}
        className="h-11 w-full rounded-[12px] border border-line bg-bg px-3 text-[14px] outline-none focus-visible:border-accent"
        {...props}
      />
    </label>
  );
}
