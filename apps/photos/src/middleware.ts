import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ts = new Date().toISOString();
    console.log(`${ts} ${request.method} ${request.nextUrl.pathname}`);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
