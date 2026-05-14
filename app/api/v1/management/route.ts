import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUsers, type UserRole } from "@/lib/data";
import { isManagementAuthed, getSessionUser } from "@/lib/auth";

const VALID_ROLES: UserRole[] = ["user", "operator", "admin"];

export async function GET() {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = getUsers().map(({ passwordHash: _passwordHash, ...u }) => u);

  const now = Date.now();
  const fifteenMin = 15 * 60 * 1000;

  const stats = {
    totalUsers: users.length,
    activeNow: users.filter((u) => u.lastActive && now - new Date(u.lastActive).getTime() < fifteenMin).length,
  };

  return NextResponse.json({ users, stats });
}

export async function PATCH(req: NextRequest) {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username, role, approved } = await req.json();
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    user.role = role;
  }
  if (approved !== undefined) user.approved = Boolean(approved);
  saveUsers(users);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username } = await req.json();
  const currentUser = await getSessionUser();
  if (currentUser?.username === username) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }
  saveUsers(getUsers().filter((u) => u.username !== username));
  return NextResponse.json({ ok: true });
}
