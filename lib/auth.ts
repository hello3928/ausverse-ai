import { cookies } from "next/headers";
import { getUserByUsername, getUsernameByToken, type User } from "@/lib/data";

export const SESSION_COOKIE = "aia_session";

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const username = getUsernameByToken(token);
  if (!username) return null;
  return getUserByUsername(username);
}

export async function isManagementAuthed(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === "admin";
}

export async function getManagementUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (user?.role === "admin") return user;
  return null;
}
