import fs from "fs";
import path from "path";

interface RagEntry {
  text: string;
}

let cachedChunks: RagEntry[] | null = null;
let cachedMtime = 0;
const indexPath = path.join(process.cwd(), "data", "rag-index.json");

function loadChunks(): RagEntry[] {
  if (!fs.existsSync(indexPath)) return [];
  const mtime = fs.statSync(indexPath).mtimeMs;
  if (cachedChunks && mtime === cachedMtime) return cachedChunks;
  try {
    const raw = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    if (!Array.isArray(raw)) return [];
    cachedChunks = raw
      .filter((e) => typeof e?.text === "string" && e.text.length > 0)
      .map((e: { text: string }) => ({ text: e.text }));
    cachedMtime = mtime;
    return cachedChunks;
  } catch {
    return [];
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreChunk(chunk: string, keywords: string[]): number {
  const lower = chunk.toLowerCase();
  return keywords.reduce((score, kw) => {
    const count = (lower.match(new RegExp(escapeRegex(kw), "g")) || []).length;
    return score + count;
  }, 0);
}

const STOP_WORDS = new Set([
  "what", "who", "is", "are", "the", "a", "an", "tell", "me", "about",
  "i", "do", "you", "know", "can", "remind", "how", "when", "where",
  "why", "which", "was", "were", "be", "been", "being", "have", "has",
  "had", "will", "would", "could", "should", "may", "might", "shall",
  "to", "of", "in", "on", "at", "by", "for", "with", "from", "up",
  "and", "but", "or", "not", "this", "that", "it", "its",
]);

export async function searchRAG(query: string, topK = 3): Promise<string[]> {
  const chunks = loadChunks();
  if (chunks.length === 0) return [];

  const keywords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (keywords.length === 0) return [];

  const scored = chunks
    .map((entry) => ({ text: entry.text, score: scoreChunk(entry.text, keywords) }))
    .filter((e) => e.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((e) => e.text);
}
