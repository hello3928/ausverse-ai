import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ sessions: [] });
  const db = getDb();
  const row = db.prepare("SELECT data FROM chat_sessions WHERE username = ?").get(user.username) as { data: string } | undefined;
  const sessions = row ? JSON.parse(row.data) : [];
  return NextResponse.json({ sessions });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  db.prepare("DELETE FROM chat_sessions WHERE username = ?").run(user.username);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const sessions = Array.isArray(body.sessions) ? body.sessions : [];
  const trimmed = sessions.slice(0, 100).map((s: Record<string, unknown>) => ({
    ...s,
    messages: Array.isArray(s.messages)
      ? (s.messages as Array<Record<string, unknown>>).slice(0, 200).map((m) => ({
          ...m,
          content: typeof m.content === "string"
          ? m.content.slice(0, 20000)
          : Array.isArray(m.content)
            ? (m.content as Array<{type: string; text?: string; image_url?: {url: string}}>).map((part) =>
                part.type === "image_url"
                  ? { type: "image_url", image_url: { url: "[image removed]" } }
                  : part
              )
            : m.content,
        }))
      : [],
  }));
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO chat_sessions (username, data) VALUES (?, ?)").run(user.username, JSON.stringify(trimmed));
  return NextResponse.json({ ok: true });
}
