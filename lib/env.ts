import "server-only";

import { timingSafeEqual } from "node:crypto";

/** True when running the production Node build. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
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
 * Require a non-empty env var. In production, missing secrets must fail closed.
 * In development, `devFallback` may be used when the var is unset.
 */
export function requireSecret(
  name: string,
  opts?: { devFallback?: string },
): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!isProduction() && opts?.devFallback) return opts.devFallback;
  throw new Error(
    `${name} is required${isProduction() ? " in production" : ""}. Set it in the environment.`,
  );
}

/** Soft read: null when unset (and no fallback allowed in prod). */
export function readSecret(
  name: string,
  opts?: { devFallback?: string },
): string | null {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (!isProduction() && opts?.devFallback) return opts.devFallback;
  return null;
}
