import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const BACKGROUND_FILE = join(
  process.cwd(),
  "public",
  "uploads",
  "background.json"
);

// GET - Load current background
export async function GET() {
  try {
    if (!existsSync(BACKGROUND_FILE)) {
      return NextResponse.json({
        backgroundImage:
          "https://images.unsplash.com/photo-1759015403439-e75abba7dfb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXN0aGV0aWMlMjBibGFja2JvYXJkJTIwY2hhbGt8ZW58MXx8fHwxNzU5NjIzNzM4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      });
    }

    const data = await readFile(BACKGROUND_FILE, "utf-8");
    const backgroundData = JSON.parse(data);

    return NextResponse.json(backgroundData);
  } catch (error) {
    console.error("Error loading background:", error);
    return NextResponse.json({
      backgroundImage:
        "https://images.unsplash.com/photo-1759015403439-e75abba7dfb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXN0aGV0aWMlMjBibGFja2JvYXJkJTIwY2hhbGt8ZW58MXx8fHwxNzU5NjIzNzM4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    });
  }
}

// POST - Save new background
export async function POST(request: NextRequest) {
  try {
    const { backgroundImage } = await request.json();

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save background data
    const backgroundData = {
      backgroundImage,
      updatedAt: new Date().toISOString(),
    };

    await writeFile(BACKGROUND_FILE, JSON.stringify(backgroundData, null, 2));

    return NextResponse.json({ success: true, backgroundData });
  } catch (error) {
    console.error("Error saving background:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save background" },
      { status: 500 }
    );
  }
}


