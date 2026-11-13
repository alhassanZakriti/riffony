"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  callbackUrl?: string;
  googleEnabled?: boolean;
};

export function SocialButtons({ callbackUrl = "/app", googleEnabled = false }: Props) {
  const startGoogle = async () => {
    if (!googleEnabled) return;
    await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
    });
  };

  return (
    <div className="space-y-2.5">
      <SocialButton
        label="Continue with Google"
        enabled={googleEnabled}
        onClick={() => void startGoogle()}
        icon={<GoogleIcon />}
      />
      <SocialButton label="Continue with Facebook" enabled={false} icon={<FacebookIcon />} />
      <SocialButton label="Continue with X" enabled={false} icon={<XIcon />} />
    </div>
  );
}

function SocialButton({
  label,
  enabled,
  onClick,
  icon,
}: {
  label: string;
  enabled: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={cn("relative w-full justify-center", !enabled && "opacity-70")}
      disabled={!enabled}
      onClick={onClick}
      title={enabled ? label : "Coming soon"}
    >
      <span className="absolute left-4">{icon}</span>
      <span>{label}</span>
      {!enabled && (
        <span className="absolute right-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
          Soon
        </span>
      )}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.8.6-2.3 1.8C5.1 19.2 8.3 21 12 21c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 1-3.6 1-2.8 0-5.1-1.9-6-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.5 7.3C2.7 8.9 2.2 10.4 2.2 12s.5 3.1 1.3 4.7l3.1-2.4c-.3-.8-.4-1.5-.4-2.3s.2-1.6.5-2.3L3.5 7.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.8 14.7 2 12 2 8.3 2 5.1 3.8 3.5 7.3l3.1 2.4C7 8 9.2 5.8 12 5.8z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23.1 10.1 24v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.9v2.3h3.3l-.5 3.5h-2.8V24C19.6 23.1 24 18.1 24 12.1z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M18.2 2H21l-6.6 7.5L22 22h-6.8l-4.3-5.6L5.7 22H3l7.1-8.1L2 2h7l3.9 5.2L18.2 2zm-1.2 18h1.9L7.1 4H5.1l11.9 16z"
      />
    </svg>
  );
}
