import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { validateAdminKey } from "@/lib/auth";
import {
  UPLOADS_DIR,
  PHOTOS_JSON_PATH,
  photoUrl,
  srcToFilename,
} from "@/lib/uploads";

// GET - Load all photos
export async function GET() {
  try {
    if (!existsSync(PHOTOS_JSON_PATH)) {
      return NextResponse.json({ photos: [] });
    }

    const data = await readFile(PHOTOS_JSON_PATH, "utf-8");
    const photos: any[] = JSON.parse(data);
    // Normalize legacy /uploads/xxx to /api/photo/xxx
    const normalized = photos.map((p: any) => {
      const filename = srcToFilename(p.src);
      if (filename) return { ...p, src: photoUrl(filename) };
      return p;
    });

    return NextResponse.json({ photos: normalized });
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

    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }

    let photos: unknown[] = [];
    if (existsSync(PHOTOS_JSON_PATH)) {
      try {
        const data = await readFile(PHOTOS_JSON_PATH, "utf-8");
        photos = JSON.parse(data);
      } catch (error) {
        console.error("Error reading existing photos:", error);
      }
    }

    photos.push(photoData);
    await writeFile(PHOTOS_JSON_PATH, JSON.stringify(photos, null, 2));

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
    const { photoId, x, y, rotation, size } = await request.json();

    if (!existsSync(PHOTOS_JSON_PATH)) {
      return NextResponse.json({ success: false, error: "No photos found" });
    }

    const data = await readFile(PHOTOS_JSON_PATH, "utf-8");
    const photos = JSON.parse(data);

    // Find and update the photo
    const photoIndex = photos.findIndex((p: any) => p.id === photoId);
    if (photoIndex === -1) {
      return NextResponse.json({ success: false, error: "Photo not found" });
    }

    const update: Record<string, unknown> = { x, y, rotation };
    if (typeof size === "number") update.size = size;
    photos[photoIndex] = { ...photos[photoIndex], ...update };

    await writeFile(PHOTOS_JSON_PATH, JSON.stringify(photos, null, 2));

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

    if (!existsSync(PHOTOS_JSON_PATH)) {
      return NextResponse.json({ success: false, error: "No photos found" });
    }

    const data = await readFile(PHOTOS_JSON_PATH, "utf-8");
    const photos: any[] = JSON.parse(data);

    const photoIndex = photos.findIndex((p: any) => p.id === photoId);
    if (photoIndex === -1) {
      return NextResponse.json({ success: false, error: "Photo not found" });
    }

    const deleted = photos[photoIndex];
    photos.splice(photoIndex, 1);
    await writeFile(PHOTOS_JSON_PATH, JSON.stringify(photos, null, 2));

    const filename = srcToFilename(deleted?.src);
    if (filename) {
      const filePath = join(UPLOADS_DIR, filename);
      if (filePath.startsWith(UPLOADS_DIR) && existsSync(filePath)) {
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
