import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// POST — log a new incident (public, called from error pages)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, title, path, cause, edge, userAgent, source } = body;

    if (!id || !code || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      `INSERT OR IGNORE INTO incidents (id, code, title, path, cause, edge, user_agent, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      code,
      title,
      path || null,
      cause || null,
      edge || null,
      userAgent || null,
      source || "client",
      new Date().toISOString()
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to log incident" }, { status: 500 });
  }
}

// GET — list incidents (admin only)
export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "operator")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const incidents = db
    .prepare(
      `SELECT * FROM incidents ORDER BY created_at DESC LIMIT 200`
    )
    .all();

  return NextResponse.json({ incidents });
}

// DELETE — clear incidents (admin only)
export async function DELETE() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();
  db.prepare("DELETE FROM incidents").run();

  return NextResponse.json({ ok: true });
}
