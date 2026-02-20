import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateAdminKey } from "@/lib/auth";

// Single static asset: always overwrite this file
const BACKGROUND_PATH = join(process.cwd(), "public", "uploads", "background.jpg");

// POST - Upload a new background image (overwrites the static file)
export async function POST(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "File must be an image" }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    await writeFile(BACKGROUND_PATH, Buffer.from(bytes));

    return NextResponse.json({ success: true, url: "/uploads/background.jpg" });
  } catch (error) {
    console.error("Error saving background:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save background" },
      { status: 500 },
    );
  }
}
