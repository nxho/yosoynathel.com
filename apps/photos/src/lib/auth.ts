import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

const ADMIN_KEY_HEADER = "x-admin-key";

/**
 * Validates the admin secret from the request header against PHOTOS_ADMIN_SECRET.
 * Used to protect upload, background, and photo position updates.
 */
export function validateAdminKey(request: NextRequest): boolean {
  const secret = process.env.PHOTOS_ADMIN_SECRET;
  if (!secret) return false;

  const key = request.headers.get(ADMIN_KEY_HEADER);
  if (!key) return false;

  try {
    const secretBuf = Buffer.from(secret);
    const keyBuf = Buffer.from(key);
    if (keyBuf.length !== secretBuf.length) return false;
    return timingSafeEqual(keyBuf, secretBuf);
  } catch {
    return false;
  }
}
