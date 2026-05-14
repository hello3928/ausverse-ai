import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUsers, saveUsers } from "@/lib/data";
import { generateApiKey, hashApiKey } from "@/lib/apikeys";

// GET — returns whether a key exists (never returns the key itself)
export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ hasKey: !!user.apiKeyHash });
}

// POST — generate a new API key (revokes existing one)
export async function POST() {
  const user = await getSessionUser();
  if (!user || !user.approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = generateApiKey();
  const hash = hashApiKey(key);

  const users = getUsers();
  const idx = users.findIndex((u) => u.username === user.username);
  if (idx === -1) return NextResponse.json({ error: "User not found" }, { status: 404 });

  users[idx].apiKeyHash = hash;
  saveUsers(users);

  // Return the plaintext key exactly once — it is never stored
  return NextResponse.json({ key });
}

// DELETE — revoke API key
export async function DELETE() {
  const user = await getSessionUser();
  if (!user || !user.approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = getUsers();
  const idx = users.findIndex((u) => u.username === user.username);
  if (idx === -1) return NextResponse.json({ error: "User not found" }, { status: 404 });

  delete users[idx].apiKeyHash;
  saveUsers(users);

  return NextResponse.json({ ok: true });
}
