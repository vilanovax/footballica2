import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { absoluteAppUrl } from "@/lib/push/appUrl";
import type { PushPayload } from "@/lib/push/types";

function botToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

export function telegramBotUsername(): string | null {
  const u = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  return u || null;
}

export function isTelegramReady(): boolean {
  return Boolean(botToken());
}

function authSecret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s) throw new Error("AUTH_SECRET missing");
  return s;
}

/** Short-lived HMAC token for `t.me/bot?start=<token>`. */
export function createTelegramLinkToken(userId: string, ttlMs = 30 * 60_000): string {
  const exp = Math.floor((Date.now() + ttlMs) / 1000);
  const body = `${userId}.${exp}`;
  const sig = createHmac("sha256", authSecret())
    .update(`tglink.${body}`)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyTelegramLinkToken(
  token: string,
): { ok: true; userId: string } | { ok: false } {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };
  const [userId, expStr, sig] = parts;
  if (!userId || !expStr || !sig) return { ok: false };
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return { ok: false };
  const body = `${userId}.${expStr}`;
  const expected = createHmac("sha256", authSecret())
    .update(`tglink.${body}`)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, userId };
}

export function telegramDeepLink(userId: string): string | null {
  const bot = telegramBotUsername();
  if (!bot || !botToken()) return null;
  const token = createTelegramLinkToken(userId);
  return `https://t.me/${bot}?start=${token}`;
}

type TelegramApiResult = { ok: boolean; description?: string };

async function telegramApi(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResult> {
  const token = botToken();
  if (!token) return { ok: false, description: "no_token" };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TelegramApiResult;
  return data;
}

export function formatTelegramMessage(payload: PushPayload): string {
  const url = absoluteAppUrl(payload.url);
  return `⚽ <b>${escapeHtml(payload.title)}</b>\n${escapeHtml(payload.body)}\n\n${url}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; blocked?: boolean }> {
  const data = await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  if (data.ok) return { ok: true };
  const desc = (data.description ?? "").toLowerCase();
  const blocked =
    desc.includes("blocked") ||
    desc.includes("chat not found") ||
    desc.includes("deactivated") ||
    desc.includes("forbidden");
  return { ok: false, blocked };
}

export async function sendTelegramNotify(
  chatId: string,
  payload: PushPayload,
): Promise<{ ok: boolean; blocked?: boolean }> {
  return sendTelegramMessage(chatId, formatTelegramMessage(payload));
}

/** Verify optional webhook secret Telegram sends in header. */
export function verifyTelegramWebhookSecret(
  headerValue: string | null,
): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  if (!headerValue) return false;
  try {
    const a = Buffer.from(headerValue);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
