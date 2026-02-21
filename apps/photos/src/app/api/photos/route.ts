import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateAdminKey } from "@/lib/auth";

const PHOTOS_FILE = join(process.cwd(), "public", "uploads", "photos.json");

// GET - Load all photos
export async function GET() {
  try {
    if (!existsSync(PHOTOS_FILE)) {
      return NextResponse.json({ photos: [] });
    }

    const data = await readFile(PHOTOS_FILE, "utf-8");
    const photos = JSON.parse(data);

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Error loading photos:", error);
    return NextResponse.json({ photos: [] });
  }
}

// POST - Save a new photo
export async function POST(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const photoData = await request.json();

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Load existing photos
    let photos = [];
    if (existsSync(PHOTOS_FILE)) {
      try {
        const data = await readFile(PHOTOS_FILE, "utf-8");
        photos = JSON.parse(data);
      } catch (error) {
        console.error("Error reading existing photos:", error);
      }
    }

    // Add new photo
    photos.push(photoData);

    // Save updated photos
    await writeFile(PHOTOS_FILE, JSON.stringify(photos, null, 2));

    return NextResponse.json({ success: true, photo: photoData });
  } catch (error) {
    console.error("Error saving photo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save photo" },
      { status: 500 },
    );
  }
}

// PUT - Update photo positions
export async function PUT(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { photoId, x, y, rotation } = await request.json();

    if (!existsSync(PHOTOS_FILE)) {
      return NextResponse.json({ success: false, error: "No photos found" });
    }

    const data = await readFile(PHOTOS_FILE, "utf-8");
    const photos = JSON.parse(data);

    // Find and update the photo
    const photoIndex = photos.findIndex((p: any) => p.id === photoId);
    if (photoIndex === -1) {
      return NextResponse.json({ success: false, error: "Photo not found" });
    }

    photos[photoIndex] = { ...photos[photoIndex], x, y, rotation };

    // Save updated photos
    await writeFile(PHOTOS_FILE, JSON.stringify(photos, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating photo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update photo" },
      { status: 500 },
    );
  }
}

// DELETE - Remove a photo
export async function DELETE(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { photoId } = await request.json();

    if (!existsSync(PHOTOS_FILE)) {
      return NextResponse.json({ success: false, error: "No photos found" });
    }

    const data = await readFile(PHOTOS_FILE, "utf-8");
    const photos: any[] = JSON.parse(data);

    const photoIndex = photos.findIndex((p: any) => p.id === photoId);
    if (photoIndex === -1) {
      return NextResponse.json({ success: false, error: "Photo not found" });
    }

    const deleted = photos[photoIndex];
    photos.splice(photoIndex, 1);
    await writeFile(PHOTOS_FILE, JSON.stringify(photos, null, 2));

    // Remove image file from disk if it's a local upload (e.g. /uploads/xxx)
    const src = deleted?.src;
    if (typeof src === "string") {
      const uploadsDir = join(process.cwd(), "public", "uploads");
      const filePath = join(uploadsDir, src.replace(/^\/uploads\//, ""));
      // Ensure the resolved path is inside the uploads directory
      if (filePath.startsWith(uploadsDir + "/") && existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch (e) {
          console.error("Error deleting image file:", e);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete photo" },
      { status: 500 },
    );
  }
}
