import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "aia.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) {
    // Health check: verify the connection is still usable
    try {
      _db.prepare("SELECT 1").get();
    } catch {
      console.error("Database connection lost, reconnecting...");
      try { _db.close(); } catch {}
      _db = null;
    }
  }

  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    _db.pragma("busy_timeout = 5000");
    initSchema(_db);
    pruneOnStartup(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
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

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      code INTEGER NOT NULL,
      title TEXT NOT NULL,
      path TEXT,
      cause TEXT,
      edge TEXT,
      user_agent TEXT,
      source TEXT NOT NULL DEFAULT 'client',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_created
      ON incidents(created_at);

    CREATE TABLE IF NOT EXISTS uptime_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      status TEXT NOT NULL,
      latency INTEGER,
      checked_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_uptime_service_date
      ON uptime_log(service, checked_at);
  `);
}

/** Run once on startup: prune stale data */
function pruneOnStartup(db: Database.Database) {
  try {
    db.prepare("DELETE FROM uptime_log WHERE checked_at < datetime('now', '-90 days')").run();
    db.prepare("DELETE FROM incidents WHERE created_at < datetime('now', '-30 days')").run();
  } catch (e) {
    console.error("Startup pruning failed:", e instanceof Error ? e.message : e);
  }
}
