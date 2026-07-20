/**
 * Temporary admin gate (Phase 2). This is intentionally lightweight — a shared
 * secret passed via `?secret=` that mints a cookie. Replace with real auth
 * (session + role check) before exposing any write operations.
 */

export const ADMIN_COOKIE = "fb_admin_session";

/** Days the admin cookie stays valid. */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 week

/** The shared secret; override via ADMIN_SECRET env in real environments. */
export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET ?? "footballica-admin";
}

/** Whether a presented cookie/query value grants admin access. */
export function isValidAdminToken(value: string | undefined | null): boolean {
  if (!value) return false;
  return value === getAdminSecret();
}
