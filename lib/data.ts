import crypto from "crypto";
import { getDb } from "@/lib/db";

// ─── Users ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "operator" | "user";

export interface UserSettings {
  theme?: "dark" | "light" | "system";
  fontSize?: "sm" | "md" | "lg";
  density?: "compact" | "default" | "comfortable";
  enterToSend?: boolean;
  autoScroll?: boolean;
  backgroundUrl?: string;
  timestamps?: boolean;
  reducedMotion?: boolean;
  confirmDelete?: boolean;
  streamResponses?: boolean;
  webSearch?: boolean;
  soundEffects?: boolean;
  desktopNotifs?: boolean;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  approved: boolean;
  createdAt: string;
  lastLogin: string | null;
  loginCount: number;
  lastActive: string | null;
  avatar?: string;
  settings?: UserSettings;
  apiKeyHash?: string;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  approved: number;
  created_at: string;
  last_login: string | null;
  login_count: number;
  last_active: string | null;
  avatar: string | null;
  settings: string | null;
  api_key_hash: string | null;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    approved: row.approved === 1,
    createdAt: row.created_at,
    lastLogin: row.last_login,
    loginCount: row.login_count,
    lastActive: row.last_active,
    ...(row.avatar ? { avatar: row.avatar } : {}),
    ...(row.settings ? { settings: JSON.parse(row.settings) } : {}),
    ...(row.api_key_hash ? { apiKeyHash: row.api_key_hash } : {}),
  };
}

export function getUsers(): User[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users").all() as UserRow[];
  return rows.map(rowToUser);
}

export function saveUsers(users: User[]): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM users");
  const ins = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, approved, created_at, last_login, login_count, last_active, avatar, settings, api_key_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    del.run();
    for (const u of users) {
      ins.run(
        u.id, u.username, u.passwordHash, u.role, u.approved ? 1 : 0,
        u.createdAt, u.lastLogin, u.loginCount, u.lastActive,
        u.avatar ?? null, u.settings ? JSON.stringify(u.settings) : null, u.apiKeyHash ?? null,
      );
    }
  });
  tx();
}

export function getUserByUsername(username: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function updateUser(
  username: string,
  fields: Partial<Omit<User, "id" | "username" | "passwordHash">>
): void {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  if (!row) return;

  const sets: string[] = [];
  const vals: unknown[] = [];

  if (fields.role !== undefined) { sets.push("role = ?"); vals.push(fields.role); }
  if (fields.approved !== undefined) { sets.push("approved = ?"); vals.push(fields.approved ? 1 : 0); }
  if (fields.lastLogin !== undefined) { sets.push("last_login = ?"); vals.push(fields.lastLogin); }
  if (fields.loginCount !== undefined) { sets.push("login_count = ?"); vals.push(fields.loginCount); }
  if (fields.lastActive !== undefined) { sets.push("last_active = ?"); vals.push(fields.lastActive); }
  if (fields.avatar !== undefined) { sets.push("avatar = ?"); vals.push(fields.avatar); }
  if (fields.settings !== undefined) { sets.push("settings = ?"); vals.push(JSON.stringify(fields.settings)); }
  if (fields.apiKeyHash !== undefined) { sets.push("api_key_hash = ?"); vals.push(fields.apiKeyHash); }

  if (sets.length === 0) return;
  vals.push(username);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE username = ?`).run(...vals);
}

// ─── Archive ─────────────────────────────────────────────────────────────────

export type ArchiveType = "image" | "video" | "file";

export interface ArchiveItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  type: ArchiveType;
  filename: string;
  createdAt: string;
  pinned?: boolean;
}

interface ArchiveRow {
  id: string;
  title: string;
  description: string;
  tags: string;
  type: string;
  filename: string;
  created_at: string;
  pinned: number;
}

function rowToArchive(row: ArchiveRow): ArchiveItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tags),
    type: row.type as ArchiveType,
    filename: row.filename,
    createdAt: row.created_at,
    ...(row.pinned ? { pinned: true } : {}),
  };
}

export function getArchive(): ArchiveItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM archive_items ORDER BY created_at DESC").all() as ArchiveRow[];
  return rows.map(rowToArchive);
}

export function saveArchive(items: ArchiveItem[]): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM archive_items");
  const ins = db.prepare(`
    INSERT INTO archive_items (id, title, description, tags, type, filename, created_at, pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    del.run();
    for (const item of items) {
      ins.run(item.id, item.title, item.description, JSON.stringify(item.tags), item.type, item.filename, item.createdAt, item.pinned ? 1 : 0);
    }
  });
  tx();
}

export function getArchiveItem(id: string): ArchiveItem | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM archive_items WHERE id = ?").get(id) as ArchiveRow | undefined;
  return row ? rowToArchive(row) : null;
}

// ─── Auth Sessions ──────────────────────────────────────────────────────────

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SESSION_MAX_AGE_MS = SESSION_TTL_SECONDS * 1000;

export function createAuthSession(username: string): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const cutoff = new Date(Date.now() - SESSION_MAX_AGE_MS).toISOString();
  db.prepare("DELETE FROM auth_sessions WHERE created_at < ?").run(cutoff);
  db.prepare("INSERT INTO auth_sessions (token, username, created_at) VALUES (?, ?, ?)").run(token, username, new Date().toISOString());
  return token;
}

export function getUsernameByToken(token: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT username, created_at FROM auth_sessions WHERE token = ?").get(token) as { username: string; created_at: string } | undefined;
  if (!row) return null;
  if (Date.now() - new Date(row.created_at).getTime() > SESSION_MAX_AGE_MS) return null;
  return row.username;
}

export function deleteAuthSession(token: string): void {
  const db = getDb();
  db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
}
