import { sql } from "@/lib/db/client";

export type UserProfileRow = {
  userId: string;
  email?: string | null;
  displayName: string;
  preferredInstrument?: string | null;
  experienceLevel?: string | null;
  trainingInterests?: string[];
  onboardingCompleted?: boolean;
};

export async function ensureUserProfile(input: UserProfileRow) {
  const db = sql();
  await db`
    INSERT INTO user_profiles (
      user_id, email, display_name, preferred_instrument, experience_level, training_interests, onboarding_completed
    ) VALUES (
      ${input.userId},
      ${input.email ?? null},
      ${input.displayName},
      ${input.preferredInstrument ?? null},
      ${input.experienceLevel ?? null},
      ${JSON.stringify(input.trainingInterests ?? [])}::jsonb,
      ${input.onboardingCompleted ?? false}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, user_profiles.email),
      display_name = CASE
        WHEN EXCLUDED.display_name <> '' THEN EXCLUDED.display_name
        ELSE user_profiles.display_name
      END,
      updated_at = NOW()
  `;
}

export async function getUserProfile(userId: string) {
  const db = sql();
  const rows = await db`
    SELECT user_id, email, display_name, preferred_instrument, experience_level,
           training_interests, onboarding_completed, created_at, updated_at
    FROM user_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function saveUserProgress(userId: string, payload: unknown) {
  const db = sql();
  await ensureUserProfile({ userId, displayName: "" });
  await db`
    INSERT INTO user_progress (user_id, payload, updated_at)
    VALUES (${userId}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;
}

export async function loadUserProgress(userId: string) {
  const db = sql();
  const rows = await db`
    SELECT payload, updated_at
    FROM user_progress
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
