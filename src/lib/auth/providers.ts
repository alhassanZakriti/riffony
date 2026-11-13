/**
 * Social providers available through Neon Managed Auth vs app UI placeholders.
 * Managed Auth supports Google (and GitHub/Microsoft/Vercel/Apple) — not Facebook/X.
 */
export const SOCIAL_PROVIDERS = [
  {
    id: "google" as const,
    label: "Continue with Google",
    managed: true,
    envReady: () => process.env.ENABLE_GOOGLE_AUTH === "true",
  },
  {
    id: "facebook" as const,
    label: "Continue with Facebook",
    managed: false,
    envReady: () => false,
  },
  {
    id: "twitter" as const,
    label: "Continue with X",
    managed: false,
    envReady: () => false,
  },
] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number]["id"];
