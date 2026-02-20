import { NextRequest } from "next/server";

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

  return key === secret;
}
