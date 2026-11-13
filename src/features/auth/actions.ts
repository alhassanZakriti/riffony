"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { ensureUserProfile } from "@/lib/db/user-data";

export type AuthFormState = { error?: string; ok?: boolean } | null;

function safeCallback(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw : "/app";
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export async function signUpWithEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  const accepted = formData.get("terms") === "on";
  const callbackUrl = safeCallback(formData.get("callbackUrl"));

  if (!name || !email || !password) return { error: "All fields are required." };
  if (!accepted) return { error: "Please accept the Terms and Privacy Policy." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const { data, error } = await auth.signUp.email({
    email,
    password,
    name,
  });

  if (error) {
    return { error: error.message || "Could not create your account." };
  }

  const userId = data?.user?.id;
  if (userId) {
    await ensureUserProfile({
      userId,
      email,
      displayName: name,
    });
  }

  redirect(callbackUrl);
}

export async function signInWithEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const callbackUrl = safeCallback(formData.get("callbackUrl"));

  if (!email || !password) return { error: "Email and password are required." };

  const { data, error } = await auth.signIn.email({ email, password });
  if (error) {
    return { error: error.message || "Invalid email or password." };
  }

  const user = data?.user;
  if (user?.id) {
    await ensureUserProfile({
      userId: user.id,
      email: user.email,
      displayName: user.name || "",
    });
  }

  redirect(callbackUrl);
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/");
}
