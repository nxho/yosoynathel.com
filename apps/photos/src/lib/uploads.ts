import { join } from "node:path";

/** Directory for uploaded files (outside public so not served as static assets). */
export const UPLOADS_DIR = join(process.cwd(), "uploads");

export const PHOTOS_JSON_PATH = join(UPLOADS_DIR, "photos.json");

/** URL path prefix for fetching a photo via API (filename is appended). */
export const PHOTO_API_PREFIX = "/api/photo/";

export function photoUrl(filename: string): string {
  return `${PHOTO_API_PREFIX}${filename}`;
}

/** Resolve stored src (legacy /uploads/xxx or /api/photo/xxx) to filename. */
export function srcToFilename(src: string): string | null {
  const m = src.match(/^\/(?:uploads|api\/photo)\/(.+)$/);
  return m ? m[1] : null;
}
