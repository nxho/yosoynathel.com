import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { UPLOADS_DIR } from "@/lib/uploads";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  const safe = filename.replace(/^\.+/, "").split("/")[0];
  if (safe !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = resolve(UPLOADS_DIR, safe);
  const uploadsResolved = resolve(UPLOADS_DIR);
  if (filePath !== uploadsResolved && !filePath.startsWith(uploadsResolved + sep)) {
    return new NextResponse(null, { status: 404 });
  }
  if (!existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = safe.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
