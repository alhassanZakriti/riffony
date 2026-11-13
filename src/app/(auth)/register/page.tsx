import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";
import { Skeleton } from "@/components/ui/controls";
import { auth } from "@/lib/auth/server";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthFormSkeleton />}>
        <RegisterGate searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function RegisterGate({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { data: session } = await auth.getSession();
  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/") && !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/app";

  if (session?.user) redirect(callbackUrl);

  const googleEnabled = process.env.ENABLE_GOOGLE_AUTH === "true";
  return <RegisterForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} />;
}

function AuthFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
