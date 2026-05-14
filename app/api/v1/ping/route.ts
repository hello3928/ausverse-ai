import { NextResponse } from "next/server";
import { updateUser } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false });
  updateUser(user.username, { lastActive: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
