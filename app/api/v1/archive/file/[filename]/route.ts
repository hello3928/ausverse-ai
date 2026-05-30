import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { getArchive } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "archive");

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  bmp: "image/bmp", ico: "image/x-icon", avif: "image/avif",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  avi: "video/x-msvideo", mkv: "video/x-matroska", m4v: "video/mp4",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
  aac: "audio/aac", flac: "audio/flac",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain", md: "text/markdown", csv: "text/csv",
  json: "application/json", xml: "application/xml",
  zip: "application/zip", gz: "application/gzip",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal
  const safe = path.basename(filename);
  if (safe !== filename || safe.includes("..")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Must be logged in
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // File must exist in archive metadata
  const archive = getArchive();
  const item = archive.find((i) => i.filename === safe);
  if (!item) return new NextResponse("Not found", { status: 404 });

  const filePath = path.join(UPLOAD_DIR, safe);
  if (!existsSync(filePath)) return new NextResponse("Not found", { status: 404 });

  const ext = safe.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_MAP[ext] ?? "application/octet-stream";
  const fileSize = statSync(filePath).size;

  // Stream the file instead of loading it entirely into memory
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
