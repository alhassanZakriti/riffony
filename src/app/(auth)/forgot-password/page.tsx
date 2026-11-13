import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";
import { ButtonLink } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="space-y-5">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Password reset</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight">Reset coming soon</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Neon Auth can email reset codes once you request them from a signed-in recovery flow. For now, create a new
            account if you cannot access yours, or contact support.
          </p>
        </div>
        <ButtonLink href="/login" variant="primary" className="w-full">
          Back to sign in
        </ButtonLink>
        <p className="text-center text-[13px] text-subtle">
          Need help?{" "}
          <Link href="mailto:hello@riffony.app" className="text-fg underline-offset-2 hover:underline">
            hello@riffony.app
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
