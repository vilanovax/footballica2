/**
 * Temporary admin gate (Phase 2). Shared secret via `?secret=` mints a cookie.
 * Replace with real auth (session + role) before exposing to a large ops team.
 */

import { readSecret, secretsEqual } from "@/lib/env";

export const ADMIN_COOKIE = "fb_admin_session";

/** Days the admin cookie stays valid. */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 week

/**
 * Admin unlock secret.
 * Production: must set `ADMIN_SECRET` (no default — fail closed).
 * Development: falls back to a known local value.
 */
export function getAdminSecret(): string | null {
  return readSecret("ADMIN_SECRET", {
    devFallback: "footballica-admin",
  });
}

/** Whether a presented cookie/query value grants admin access. */
export function isValidAdminToken(value: string | undefined | null): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return secretsEqual(value, secret);
}
