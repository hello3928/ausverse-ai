import { NextRequest, NextResponse } from "next/server";
import { getAnnouncement, saveAnnouncement } from "@/lib/announcement";
import { isManagementAuthed } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ text: getAnnouncement() });
}

const MAX_ANNOUNCEMENT_LENGTH = 500;

export async function POST(req: NextRequest) {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.slice(0, MAX_ANNOUNCEMENT_LENGTH) : "";
  saveAnnouncement(text);
  return NextResponse.json({ ok: true });
}
