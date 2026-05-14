#!/usr/bin/env node
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "aia.db");

function readJson(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_login TEXT,
    login_count INTEGER NOT NULL DEFAULT 0,
    last_active TEXT,
    avatar TEXT,
    settings TEXT,
    api_key_hash TEXT
  );
  CREATE TABLE IF NOT EXISTS archive_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    created_at TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chat_sessions (
    username TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const crypto = require("crypto");

const users = readJson("users.json");
if (Array.isArray(users) && users.length > 0) {
  const ins = db.prepare(`
    INSERT OR REPLACE INTO users (id, username, password_hash, role, approved, created_at, last_login, login_count, last_active, avatar, settings, api_key_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const u of users) {
      ins.run(
        u.id || crypto.randomUUID(),
        u.username,
        u.passwordHash,
        u.role || "user",
        (u.approved === true || u.approved === 1) ? 1 : 0,
        u.createdAt || new Date().toISOString(),
        u.lastLogin || null,
        u.loginCount || 0,
        u.lastActive || null,
        u.avatar || null,
        u.settings ? JSON.stringify(u.settings) : null,
        u.apiKeyHash || null,
      );
    }
  });
  tx();
  console.log(`✓ Migrated ${users.length} user(s)`);
} else {
  console.log("  No users to migrate");
}

const archive = readJson("archive.json");
if (Array.isArray(archive) && archive.length > 0) {
  const ins = db.prepare(`
    INSERT OR REPLACE INTO archive_items (id, title, description, tags, type, filename, created_at, pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const item of archive) {
      ins.run(
        item.id, item.title, item.description || "",
        JSON.stringify(item.tags || []), item.type, item.filename,
        item.createdAt, item.pinned ? 1 : 0,
      );
    }
  });
  tx();
  console.log(`✓ Migrated ${archive.length} archive item(s)`);
} else {
  console.log("  No archive items to migrate");
}

const sessions = readJson("sessions.json");
if (sessions && typeof sessions === "object") {
  const ins = db.prepare("INSERT OR REPLACE INTO chat_sessions (username, data) VALUES (?, ?)");
  const tx = db.transaction(() => {
    for (const [username, data] of Object.entries(sessions)) {
      ins.run(username, JSON.stringify(data));
    }
  });
  tx();
  console.log(`✓ Migrated chat sessions for ${Object.keys(sessions).length} user(s)`);
} else {
  console.log("  No chat sessions to migrate");
}

const announcement = readJson("announcement.json");
if (announcement) {
  const text = typeof announcement === "string" ? announcement : announcement.text || "";
  db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES ('announcement', ?)").run(text);
  console.log(`✓ Migrated announcement`);
}

db.close();
console.log(`\nDone. Database at: ${DB_PATH}`);
