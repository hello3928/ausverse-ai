import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByUsername, updateUser, createAuthSession, deleteAuthSession, SESSION_TTL_SECONDS } from "@/lib/data";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { sendAlert, escapeHtml } from "@/lib/email";
import { cookies } from "next/headers";

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    maxAge,
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ loggedIn: false, username: null, role: null, approved: false, avatar: null });
  return NextResponse.json({ loggedIn: true, username: user.username, role: user.role, approved: user.approved !== false, avatar: user.avatar ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password, action } = body;

  if (action === "logout") {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) deleteAuthSession(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return res;
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    if (user.role === "admin") {
      await sendAlert(
        "⚠️ Failed admin login attempt",
        `<p>A failed login attempt was made on the admin account <strong>${escapeHtml(user.username)}</strong>.</p><p>Time: ${new Date().toISOString()}</p>`,
      );
    }
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  updateUser(user.username, {
    lastLogin: new Date().toISOString(),
    loginCount: (user.loginCount ?? 0) + 1,
  });

  const token = createAuthSession(user.username);
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_SECONDS));
  return res;
}
