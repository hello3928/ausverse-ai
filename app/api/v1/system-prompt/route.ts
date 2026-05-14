import { NextRequest, NextResponse } from "next/server";
import { isManagementAuthed } from "@/lib/auth";
import fs from "fs";
import path from "path";

const promptPath = path.join(process.cwd(), "data", "system-prompt.txt");

export async function GET() {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const text = fs.readFileSync(promptPath, "utf-8");
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: "" });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isManagementAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  fs.writeFileSync(promptPath, body.text);
  return NextResponse.json({ ok: true });
}
