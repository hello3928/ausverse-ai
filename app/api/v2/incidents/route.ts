import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// ─── IP-based rate limiting (in-memory) ────────────────────────────────────
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 10; // max 10 incidents per IP per minute
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_MAX;
}

// Clean up stale buckets periodically (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets) {
    if (now > bucket.resetAt) ipBuckets.delete(ip);
  }
}, 5 * 60_000);

// ─── Field length limits ───────────────────────────────────────────────────
function cap(val: unknown, maxLen: number): string | null {
  if (typeof val !== "string") return null;
  return val.slice(0, maxLen);
}

const VALID_SOURCES = new Set(["client", "app", "nginx", "cloudflare"]);
const MAX_INCIDENTS = 10_000;

// POST — log a new incident (public, called from error pages)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, code, title } = body;

    if (!id || !code || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate code is a number
    const numCode = Number(code);
    if (!Number.isFinite(numCode) || numCode < 100 || numCode > 999) {
      return NextResponse.json({ error: "Invalid error code" }, { status: 400 });
    }

    // Validate source
    const source = VALID_SOURCES.has(body.source) ? body.source : "client";

    const db = getDb();

    // Cap total incidents to prevent unbounded growth
    const countRow = db.prepare("SELECT count(*) as c FROM incidents").get() as { c: number };
    if (countRow.c >= MAX_INCIDENTS) {
      // Prune oldest 20%
      db.prepare(
        `DELETE FROM incidents WHERE id IN (SELECT id FROM incidents ORDER BY created_at ASC LIMIT ?)`
      ).run(Math.floor(MAX_INCIDENTS * 0.2));
    }

    // Prune entries older than 30 days
    db.prepare("DELETE FROM incidents WHERE created_at < datetime('now', '-30 days')").run();

    db.prepare(
      `INSERT OR IGNORE INTO incidents (id, code, title, path, cause, edge, user_agent, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      cap(id, 50),
      numCode,
      cap(title, 200),
      cap(body.path, 500),
      cap(body.cause, 1000),
      cap(body.edge, 20),
      cap(body.userAgent, 500),
      source,
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
