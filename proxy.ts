import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  getAdminSecret,
} from "@/lib/admin/auth";
import { secretsEqual } from "@/lib/env";

/**
 * Next.js 16 "Proxy" (formerly Middleware). Its only job for the admin gate is
 * the side effect layouts can't do: when a valid `?secret=` is presented on an
 * `/admin` route, mint the session cookie and redirect to the clean URL. The
 * actual access *check* lives in `app/admin/layout.tsx` (reads the cookie).
 */
export function proxy(request: NextRequest): NextResponse {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");
  const expected = getAdminSecret();

  if (secretsEqual(secret, expected)) {
    // Strip the secret from the URL so it doesn't linger in history/logs.
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("secret");

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(ADMIN_COOKIE, expected!, {
      httpOnly: true,
      // Secure cookies on plain http://localhost break some browsers when
      // NODE_ENV=production; only mark Secure on real HTTPS.
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/admin",
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
