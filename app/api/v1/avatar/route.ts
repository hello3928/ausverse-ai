import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateUser } from "@/lib/data";
import { AVATARS } from "@/lib/avatars";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { avatarId } = await req.json().catch(() => ({}));
  const valid = AVATARS.find((a) => a.id === avatarId);
  if (!valid) return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });

  updateUser(user.username, { avatar: avatarId });
  return NextResponse.json({ ok: true, avatar: avatarId });
}
