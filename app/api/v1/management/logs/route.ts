import { NextResponse } from "next/server";
import fs from "fs";
import { isManagementAuthed } from "@/lib/auth";

const OUT_LOG = "/home/ubuntu/.pm2/logs/hall-of-legends-out-0.log";
const ERR_LOG = "/home/ubuntu/.pm2/logs/hall-of-legends-error-0.log";

// Read last N bytes of a file and extract the last `lines` non-empty lines.
// Avoids loading multi-GB log files into memory.
function readLastLines(filePath: string, maxLines: number, tailBytes = 256 * 1024): string {
  try {
    const stat = fs.statSync(filePath);
    const size = stat.size;
    if (size === 0) return "";

    const readSize = Math.min(tailBytes, size);
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, size - readSize);
    fs.closeSync(fd);

    const text = buf.toString("utf-8");
    const lines = text.split("\n").filter((l) => l.length > 0);
    // If we read from middle of file, first line may be partial — drop it
    const safeLines = readSize < size ? lines.slice(1) : lines;
    return safeLines.slice(-maxLines).join("\n");
  } catch {
    return "";
  }
}

export async function GET() {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    out: readLastLines(OUT_LOG, 300),
    error: readLastLines(ERR_LOG, 150),
  });
}
