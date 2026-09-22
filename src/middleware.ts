import { NextRequest, NextResponse } from "next/server";

/**
 * Prototype hosts — each surface is served at the root of its own port:
 *
 *   :3000  desktop survey app (default)
 *   :3001  iOS prototype        → rewrites / to /ios
 *   :3002  field-survey phone   → rewrites / to /mobile
 *
 * Only "/" is matched, so deep links (e.g. :3002/reports) keep working as-is
 * on every host. Rewrites keep the address bar clean at the root.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const target =
    host === "localhost:3001" || host === "127.0.0.1:3001"
      ? "/ios"
      : host === "localhost:3002" || host === "127.0.0.1:3002"
        ? "/mobile"
        : null;
  if (!target) return NextResponse.next();
  return NextResponse.rewrite(new URL(target, req.url));
}

export const config = { matcher: "/" };
