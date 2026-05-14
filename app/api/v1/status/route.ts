import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAnnouncement, saveAnnouncement } from "@/lib/announcement";

const DATA_DIR = path.join(process.cwd(), "data");
const DEGRADED_LATENCY_MS = 1500;
const FETCH_TIMEOUT_MS = 8000;

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; latency: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latency: Date.now() - start };
}

async function checkWebServer(baseUrl: string) {
  const { result, latency } = await timed(() =>
    fetchWithTimeout(`${baseUrl}/api/v1/announcement`).then((r) => r.ok)
  ).catch(() => ({ result: false, latency: 0 }));
  const slow = result && latency > DEGRADED_LATENCY_MS;
  return {
    status: result ? (slow ? "degraded" as const : "operational" as const) : "down" as const,
    detail: result ? (slow ? "Web server performing slowly" : "Web server responding normally") : "Web server unreachable",
    latency,
  };
}

async function checkAI() {
  const { result, latency } = await timed(() =>
    fetchWithTimeout("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    }).then((r) => r.ok)
  ).catch(() => ({ result: false, latency: 0 }));
  const slow = result && latency > DEGRADED_LATENCY_MS;
  return {
    status: result ? (slow ? "degraded" as const : "operational" as const) : "down" as const,
    detail: result ? (slow ? "AI engine performing slowly" : "AI engine reachable") : "AI engine unreachable",
    latency,
  };
}

async function checkOwnAPI(baseUrl: string) {
  const { result, latency } = await timed(() =>
    fetchWithTimeout(`${baseUrl}/api/v1/chat`, { method: "HEAD" })
      .then((r) => r.status < 500)
  ).catch(() => ({ result: false, latency: 0 }));
  const slow = result && latency > DEGRADED_LATENCY_MS;
  return {
    status: result ? (slow ? "degraded" as const : "operational" as const) : "down" as const,
    detail: result ? (slow ? "API responding slowly" : "API responding normally") : "API unreachable",
    latency,
  };
}

async function checkSearch() {
  // Do NOT make a live search call here — the status page polls every 30s and
  // a real search call burns credits on every poll.
  // Instead just verify the key is configured.
  const key = process.env.TAVILY_API_KEY;
  return key
    ? { status: "operational" as const, detail: "Search engine configured" }
    : { status: "down" as const, detail: "Search engine not configured" };
}

async function checkFileSystem() {
  const requiredFiles = ["system-prompt.txt"];
  const requiredDirs = ["uploads"];
  const missingFiles = requiredFiles.filter((f) => !fs.existsSync(path.join(DATA_DIR, f)));
  const missingDirs = requiredDirs.filter((d) => !fs.existsSync(path.join(DATA_DIR, d)));
  const missing = [...missingFiles, ...missingDirs];
  const dbExists = fs.existsSync(path.join(DATA_DIR, "aia.db"));
  if (!dbExists) missing.push("aia.db");
  return {
    status: missing.length === 0 ? "operational" as const : "degraded" as const,
    detail: missing.length === 0 ? "All data files present" : `Missing: ${missing.join(", ")}`,
  };
}

async function checkAuth() {
  try {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    db.prepare("SELECT count(*) as c FROM users").get();
    return { status: "operational" as const, detail: "User store accessible" };
  } catch {
    return { status: "down" as const, detail: "User store unavailable" };
  }
}

async function checkAIData() {
  try {
    const p = path.join(DATA_DIR, "system-prompt.txt");
    const size = fs.statSync(p).size;
    return { status: "operational" as const, detail: `Intelligence briefing loaded (${Math.round(size / 1024)}KB)` };
  } catch {
    return { status: "down" as const, detail: "Intelligence briefing unavailable" };
  }
}

async function checkEmail() {
  const { result, latency } = await timed(() =>
    fetchWithTimeout("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    }).then((r) => r.ok)
  ).catch(() => ({ result: false, latency: 0 }));
  const slow = result && latency > DEGRADED_LATENCY_MS;
  return {
    status: result ? (slow ? "degraded" as const : "operational" as const) : "down" as const,
    detail: result ? (slow ? "Email service performing slowly" : "Email service reachable") : "Email service unreachable",
    latency,
  };
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const [webServer, ownAPI, ai, search, fileSystem, auth, aiData, email] = await Promise.all([
    checkWebServer(baseUrl),
    checkOwnAPI(baseUrl),
    checkAI(),
    checkSearch(),
    checkFileSystem(),
    checkAuth(),
    checkAIData(),
    checkEmail(),
  ]);

  const checks = [
    { name: "Web Server",    ...webServer },
    { name: "Ausverse API",  ...ownAPI },
    { name: "AI Engine",     ...ai },
    { name: "Search Engine", ...search },
    { name: "File System",   ...fileSystem },
    { name: "Auth System",   ...auth },
    { name: "AI Data",       ...aiData },
    { name: "Email Alerts",  ...email },
  ];

  const down = checks.filter((c) => c.status === "down").length;
  const degraded = checks.filter((c) => c.status === "degraded").length;
  const overall = down > 0 || degraded > 0
    ? (down > checks.length / 2 ? "down" : "degraded")
    : "operational";

  const DEGRADED_MSG = "Service performance is currently degraded";
  const current = getAnnouncement();
  if (overall !== "operational" && current !== DEGRADED_MSG) {
    saveAnnouncement(DEGRADED_MSG);
  } else if (overall === "operational" && current === DEGRADED_MSG) {
    saveAnnouncement("");
  }

  return NextResponse.json({ overall, checks, timestamp: new Date().toISOString() });
}
