import type { Metadata } from "next";
import { RegisterForm } from "@/features/marketing/local-auth-forms";

export const metadata: Metadata = {
  title: "Start Free Trial",
  description: "Create a free local RIFFLEX profile and start training.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
