import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateAdminKey } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    const isBackground = data.get("background") === "true" || data.get("purpose") === "background";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({
        success: false,
        error: "File must be an image",
      });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: "File size must be less than 10MB",
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${randomString}.${extension}`;

    const filepath = join(uploadsDir, filename);

    // Write file to disk
    await writeFile(filepath, buffer);

    // Get image dimensions (default for now)
    let width = 80;
    let height = 80;

    // Save photo metadata
    const photoId = Date.now().toString();
    const photoData = {
      id: photoId,
      src: `/uploads/${filename}`,
      x: Math.random() * 200 + 100, // Default position
      y: Math.random() * 150 + 100,
      rotation: Math.random() * 20 - 10,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      width,
      height,
    };

    // Only add to photos list when not uploading as background
    if (!isBackground) {
      const metadataPath = join(
        process.cwd(),
        "public",
        "uploads",
        "photos.json"
      );
      let photos = [];

      try {
        if (existsSync(metadataPath)) {
          const existingData = await readFile(metadataPath, "utf-8");
          photos = JSON.parse(existingData);
        }
      } catch (error) {
        console.error("Error reading photos metadata:", error);
      }

      photos.push(photoData);
      await writeFile(metadataPath, JSON.stringify(photos, null, 2));
    }

    // Return the public URL
    const url = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename: file.name,
      size: file.size,
      type: file.type,
      photoData,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
