import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "fb_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

type SessionPayload = {
  uid: string;
  exp: number;
};

function authSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.DATABASE_URL ??
    "footballica-dev-secret-change-me"
  );
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(body: string): string {
  return b64url(createHmac("sha256", authSecret()).update(body).digest());
}

function encodeSession(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const json = fromB64url(body).toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload?.uid || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Read the authenticated user id from the httpOnly session cookie. */
export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = decodeSession(raw);
  return payload?.uid ?? null;
}

/** Issue / refresh the session cookie for a user. */
export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  const token = encodeSession({
    uid: userId,
    exp: Date.now() + MAX_AGE_SEC * 1000,
  });
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

/** Clear the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
