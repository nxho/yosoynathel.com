import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
      { status: 500 }
    );
  }
}

// PUT - Update photo positions
export async function PUT(request: NextRequest) {
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
      { status: 500 }
    );
  }
}
