import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendTelegramMessage,
  verifyTelegramLinkToken,
  verifyTelegramWebhookSecret,
} from "@/lib/push/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TgUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string; type?: string };
    from?: { is_bot?: boolean };
  };
};

/**
 * Telegram Bot API webhook — link Footballica accounts via /start <token>.
 * Set webhook to https://<host>/api/telegram/webhook with secret_token.
 */
export async function POST(req: Request) {
  if (
    !verifyTelegramWebhookSecret(
      req.headers.get("x-telegram-bot-api-secret-token"),
    )
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = msg?.text?.trim() ?? "";
  if (chatId == null || !text) {
    return NextResponse.json({ ok: true });
  }

  const chatIdStr = String(chatId);

  if (text === "/start" || text.startsWith("/start ")) {
    const token = text === "/start" ? "" : text.slice("/start ".length).trim();
    if (!token) {
      await sendTelegramMessage(
        chatIdStr,
        "Open Footballica → Settings → Telegram, then tap Connect so I know which club is yours.",
      );
      return NextResponse.json({ ok: true });
    }

    const verified = verifyTelegramLinkToken(token);
    if (!verified.ok) {
      await sendTelegramMessage(
        chatIdStr,
        "That link expired. Open Settings → Telegram and connect again.",
      );
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { id: true, isBot: true },
    });
    if (!user || user.isBot) {
      await sendTelegramMessage(chatIdStr, "Account not found.");
      return NextResponse.json({ ok: true });
    }

    // One chat ↔ one user; re-link moves ownership.
    await prisma.$transaction([
      prisma.telegramNotifyLink.deleteMany({
        where: {
          OR: [{ chatId: chatIdStr }, { userId: user.id }],
        },
      }),
      prisma.telegramNotifyLink.create({
        data: {
          userId: user.id,
          chatId: chatIdStr,
          enabled: true,
        },
      }),
    ]);

    await sendTelegramMessage(
      chatIdStr,
      "✅ Linked! I’ll ping you for Draft Duel turns, a nearly full Safe, newspaper, and full stamina. Manage prefs in Footballica Settings.",
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/unlink" || text === "/stop") {
    await prisma.telegramNotifyLink.deleteMany({
      where: { chatId: chatIdStr },
    });
    await sendTelegramMessage(
      chatIdStr,
      "Unlinked. You can reconnect anytime from Settings.",
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(
    chatIdStr,
    "Commands: /start (from Settings link) · /unlink",
  );
  return NextResponse.json({ ok: true });
}
