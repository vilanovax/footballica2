import "server-only";

import { timingSafeEqual } from "node:crypto";

/** True when running the production Node build. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * True on a real hosted deploy (Vercel, etc.).
 * Local `next start` sets NODE_ENV=production but is NOT a deploy — keep
 * developer fallbacks there so admin/cron secrets still work without a full
 * Vercel env matrix.
 */
export function isDeployed(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.FORCE_STRICT_SECRETS === "1"
  );
}

/**
 * Constant-time string compare for secrets.
 * Length mismatch short-circuits (still constant relative to equal lengths).
 */
export function secretsEqual(
  presented: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!presented || !expected) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Require a non-empty env var. On deployed hosts, missing secrets fail closed.
 * Locally (including `next start`), `devFallback` may be used when unset.
 */
export function requireSecret(
  name: string,
  opts?: { devFallback?: string },
): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!isDeployed() && opts?.devFallback) return opts.devFallback;
  throw new Error(
    `${name} is required${isDeployed() ? " on deployed hosts" : ""}. Set it in the environment.`,
  );
}

/** Soft read: null when unset (and no fallback allowed on deployed hosts). */
export function readSecret(
  name: string,
  opts?: { devFallback?: string },
): string | null {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!isDeployed() && opts?.devFallback) return opts.devFallback;
  return null;
}
