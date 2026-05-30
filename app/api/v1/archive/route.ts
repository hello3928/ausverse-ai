import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, createWriteStream, unlinkSync } from "fs";
import path from "path";
import busboy from "busboy";
import { Readable } from "stream";
import { getArchive, saveArchive, type ArchiveType } from "@/lib/data";
import { isManagementAuthed, getSessionUser } from "@/lib/auth";

export const maxDuration = 300; // allow up to 5 min for large uploads
export const dynamic = "force-dynamic";

const VALID_TYPES: ArchiveType[] = ["image", "video", "file"];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const ALLOWED_EXTENSIONS = new Set([
  "jpg","jpeg","png","gif","webp","svg","bmp","ico","avif",
  "mp4","mov","avi","mkv","webm","m4v",
  "pdf","doc","docx","xls","xlsx","ppt","pptx","txt","md","csv",
  "zip","tar","gz","7z","rar",
  "mp3","wav","ogg","aac","flac",
  "json","xml",
]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = getArchive()
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return NextResponse.json(items);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN ?? "https://ausverseai.com",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Credentials": "true",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "data", "uploads", "archive");
  mkdirSync(uploadDir, { recursive: true });

  const fields: Record<string, string> = {};
  let filename = "";
  let filePath = "";
  let tooBig = false;
  let writeStreamDone: Promise<void> = Promise.resolve();

  await new Promise<void>((resolve, reject) => {
    const bb = busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: MAX_FILE_SIZE },
    });

    bb.on("field", (name, val) => { fields[name] = val; });

    bb.on("file", (_fieldname, fileStream, info) => {
      const rawExt = info.filename.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ?? "bin";
      const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : "bin";
      const id = crypto.randomUUID();
      filename = `${id}.${ext}`;
      filePath = path.join(uploadDir, filename);
      const ws = createWriteStream(filePath);

      writeStreamDone = new Promise<void>((res, rej) => {
        ws.on("finish", res);
        ws.on("error", rej);
      });

      fileStream.on("limit", () => { tooBig = true; fileStream.resume(); });
      fileStream.pipe(ws);
      ws.on("error", reject);
    });

    bb.on("finish", resolve);
    bb.on("error", reject);

    Readable.fromWeb(req.body as import("stream/web").ReadableStream).pipe(bb);
  });

  await writeStreamDone;

  if (tooBig) {
    // Clean up the partial file written to disk
    if (filePath) try { unlinkSync(filePath); } catch {}
    return NextResponse.json({ error: "File too large (max 5 GB)" }, { status: 413 });
  }

  const title = fields.title?.trim();
  if (!title || !filename) {
    if (filePath) try { unlinkSync(filePath); } catch {}
    return NextResponse.json({ error: "File and title required" }, { status: 400 });
  }

  const typeRaw = fields.type ?? "";
  const type: ArchiveType = VALID_TYPES.includes(typeRaw as ArchiveType)
    ? (typeRaw as ArchiveType)
    : "file";

  let tags: string[];
  try {
    tags = JSON.parse(fields.tags ?? "[]");
    if (!Array.isArray(tags)) tags = [];
  } catch {
    tags = [];
  }

  const item = {
    id: filename.split(".")[0],
    title,
    description: fields.description ?? "",
    tags,
    type,
    filename,
    createdAt: new Date().toISOString(),
  };

  const archive = getArchive();
  archive.unshift(item);
  saveArchive(archive);

  return NextResponse.json(item, { headers: CORS_HEADERS });
}
