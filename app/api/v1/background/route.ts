import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, updateUser } from "@/lib/data";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "backgrounds");
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Max 8 MB." }, { status: 400 });
  }

  // Ensure upload dir exists
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Delete any previous custom background for this user
  const full = getUserByUsername(user.username);
  const prevUrl = full?.settings?.backgroundUrl;
  if (prevUrl && prevUrl.startsWith("/api/v1/background/")) {
    const prevFilename = prevUrl.split("/").pop();
    if (prevFilename) {
      const prevPath = path.join(UPLOAD_DIR, prevFilename);
      if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
    }
  }

  // Generate unique filename
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const hash = crypto.randomBytes(12).toString("hex");
  const filename = `${user.username}-${hash}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // Build the URL and persist to user settings
  const backgroundUrl = `/api/v1/background/${filename}`;
  const existing = full?.settings ?? {};
  updateUser(user.username, { settings: { ...existing, backgroundUrl } });

  return NextResponse.json({ url: backgroundUrl });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const full = getUserByUsername(user.username);
  const prevUrl = full?.settings?.backgroundUrl;
  if (prevUrl && prevUrl.startsWith("/api/v1/background/")) {
    const prevFilename = prevUrl.split("/").pop();
    if (prevFilename) {
      const prevPath = path.join(UPLOAD_DIR, prevFilename);
      if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
    }
  }

  const existing = full?.settings ?? {};
  updateUser(user.username, { settings: { ...existing, backgroundUrl: "" } });

  return NextResponse.json({ ok: true });
}
