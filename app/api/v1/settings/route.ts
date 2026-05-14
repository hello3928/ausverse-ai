import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateUser, getUserByUsername, UserSettings } from "@/lib/data";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({});
  const full = getUserByUsername(user.username);
  return NextResponse.json(full?.settings ?? {});
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const settings: UserSettings = {};

  // Appearance
  if (["dark","light","system"].includes(body.theme)) settings.theme = body.theme;
  if (["sm","md","lg"].includes(body.fontSize)) settings.fontSize = body.fontSize;
  if (["compact","default","comfortable"].includes(body.density)) settings.density = body.density;
  if (typeof body.backgroundUrl === "string") settings.backgroundUrl = body.backgroundUrl;
  if (typeof body.timestamps === "boolean") settings.timestamps = body.timestamps;
  if (typeof body.reducedMotion === "boolean") settings.reducedMotion = body.reducedMotion;

  // Chat
  if (typeof body.enterToSend === "boolean") settings.enterToSend = body.enterToSend;
  if (typeof body.autoScroll === "boolean") settings.autoScroll = body.autoScroll;
  if (typeof body.confirmDelete === "boolean") settings.confirmDelete = body.confirmDelete;
  if (typeof body.streamResponses === "boolean") settings.streamResponses = body.streamResponses;
  if (typeof body.webSearch === "boolean") settings.webSearch = body.webSearch;

  // Notifications
  if (typeof body.soundEffects === "boolean") settings.soundEffects = body.soundEffects;
  if (typeof body.desktopNotifs === "boolean") settings.desktopNotifs = body.desktopNotifs;

  const existing = getUserByUsername(user.username)?.settings ?? {};
  updateUser(user.username, { settings: { ...existing, ...settings } });
  return NextResponse.json({ ok: true });
}
