import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUsers, saveUsers } from "@/lib/data";
import { sendAlert, escapeHtml } from "@/lib/email";

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;

  if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (username.length < 3) return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  if (username.length > 30) return NextResponse.json({ error: "Username must be 30 characters or fewer" }, { status: 400 });
  if (!USERNAME_RE.test(username)) return NextResponse.json({ error: "Username may only contain letters, numbers, underscores, and hyphens" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  if (password.length > 256) return NextResponse.json({ error: "Password too long" }, { status: 400 });

  const users = getUsers();
  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role: "user",
    approved: false,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    loginCount: 0,
    lastActive: null,
  });
  saveUsers(users);

  await sendAlert(
    "🔔 New account pending approval",
    `<p>A new user <strong>${escapeHtml(username)}</strong> has registered and is awaiting approval.</p><p>Time: ${new Date().toISOString()}</p><p>Approve or deny in the management panel.</p>`,
  );

  return NextResponse.json({ ok: true, pending: true });
}
