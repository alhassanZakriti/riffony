import type { Metadata } from "next";
import { LoginForm } from "@/features/marketing/local-auth-forms";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Continue your RIFFLEX training on this device.",
};

export default function LoginPage() {
  return <LoginForm />;
}
