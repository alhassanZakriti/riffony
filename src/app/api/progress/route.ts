import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { ensureUserProfile, loadUserProgress, saveUserProgress } from "@/lib/db/user-data";

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await loadUserProgress(session.user.id);
  return NextResponse.json({
    payload: row?.payload ?? null,
    updatedAt: row?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { payload?: unknown };
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await ensureUserProfile({
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.name || "",
  });
  await saveUserProgress(session.user.id, body.payload);

  return NextResponse.json({ ok: true });
}
