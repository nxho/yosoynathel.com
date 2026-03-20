import { NextRequest, NextResponse } from "next/server";
import { validateAdminKey } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const valid = validateAdminKey(request);
  if (!valid) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  return NextResponse.json({ admin: true });
}
