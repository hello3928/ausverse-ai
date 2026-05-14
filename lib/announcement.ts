import { getDb } from "@/lib/db";

export function getAnnouncement(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM kv WHERE key = 'announcement'").get() as { value: string } | undefined;
  return row?.value ?? "";
}

export function saveAnnouncement(text: string): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES ('announcement', ?)").run(text);
}
