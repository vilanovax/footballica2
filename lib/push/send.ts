import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureWebPushConfigured, webpush } from "@/lib/push/webPush";
import type { PushPayload } from "@/lib/push/types";
import { isTelegramReady, sendTelegramNotify } from "@/lib/push/telegram";

const DUEL_COOLDOWN_MS = 2 * 60_000;
const VAULT_COOLDOWN_MS = 12 * 60 * 60_000;
/** Once per Tehran day is enough — newspaper is a daily claim. */
const NEWSPAPER_COOLDOWN_MS = 20 * 60 * 60_000;
/** Avoid spam while stamina sits at max. */
const STAMINA_COOLDOWN_MS = 8 * 60 * 60_000;

type PrefField =
  | "duelYourTurn"
  | "vaultNearlyFull"
  | "newspaperReady"
  | "staminaFull";

type WebCooldownField =
  | "lastDuelPushAt"
  | "lastVaultPushAt"
  | "lastNewspaperPushAt"
  | "lastStaminaPushAt";

type TgCooldownField =
  | "lastDuelAt"
  | "lastVaultAt"
  | "lastNewspaperAt"
  | "lastStaminaAt";

type SendResult = { sent: number; pruned: number };

async function deliverWeb(
  userId: string,
  payload: PushPayload,
  filter: {
    prefer: PrefField;
    cooldownField: WebCooldownField;
    cooldownMs: number;
  },
): Promise<SendResult> {
  if (!ensureWebPushConfigured()) return { sent: 0, pruned: 0 };

  const now = new Date();
  const subs = await prisma.pushSubscription.findMany({
    where: {
      userId,
      [filter.prefer]: true,
    },
  });

  let sent = 0;
  let pruned = 0;
  const body = JSON.stringify(payload);

  for (const sub of subs) {
    const last = sub[filter.cooldownField];
    if (last && now.getTime() - last.getTime() < filter.cooldownMs) continue;

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 60 * 60 },
      );
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { [filter.cooldownField]: now },
      });
      sent += 1;
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        pruned += 1;
      }
    }
  }

  return { sent, pruned };
}

async function deliverTelegram(
  userId: string,
  payload: PushPayload,
  filter: {
    prefer: PrefField;
    cooldownField: TgCooldownField;
    cooldownMs: number;
  },
): Promise<SendResult> {
  if (!isTelegramReady()) return { sent: 0, pruned: 0 };

  const link = await prisma.telegramNotifyLink.findUnique({
    where: { userId },
  });
  if (!link || !link.enabled || !link[filter.prefer]) {
    return { sent: 0, pruned: 0 };
  }

  const now = new Date();
  const last = link[filter.cooldownField];
  if (last && now.getTime() - last.getTime() < filter.cooldownMs) {
    return { sent: 0, pruned: 0 };
  }

  const res = await sendTelegramNotify(link.chatId, payload);
  if (res.blocked) {
    await prisma.telegramNotifyLink.delete({ where: { id: link.id } });
    return { sent: 0, pruned: 1 };
  }
  if (!res.ok) return { sent: 0, pruned: 0 };

  await prisma.telegramNotifyLink.update({
    where: { id: link.id },
    data: { [filter.cooldownField]: now },
  });
  return { sent: 1, pruned: 0 };
}

async function deliver(
  userId: string,
  payload: PushPayload,
  filter: {
    prefer: PrefField;
    webCooldown: WebCooldownField;
    tgCooldown: TgCooldownField;
    cooldownMs: number;
  },
): Promise<SendResult> {
  const [web, tg] = await Promise.all([
    deliverWeb(userId, payload, {
      prefer: filter.prefer,
      cooldownField: filter.webCooldown,
      cooldownMs: filter.cooldownMs,
    }),
    deliverTelegram(userId, payload, {
      prefer: filter.prefer,
      cooldownField: filter.tgCooldown,
      cooldownMs: filter.cooldownMs,
    }),
  ]);
  return {
    sent: web.sent + tg.sent,
    pruned: web.pruned + tg.pruned,
  };
}

async function assertHuman(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBot: true },
  });
  return Boolean(user && !user.isBot);
}

/** Notify a human that it is their Draft Duel turn. */
export async function notifyDuelYourTurn(
  userId: string,
  duelId: string,
): Promise<SendResult> {
  if (!(await assertHuman(userId))) return { sent: 0, pruned: 0 };

  return deliver(
    userId,
    {
      type: "duel_your_turn",
      title: "Your turn!",
      body: "A Draft Duel is waiting — take the kick.",
      url: `/play/duel/${duelId}`,
      duelId,
    },
    {
      prefer: "duelYourTurn",
      webCooldown: "lastDuelPushAt",
      tgCooldown: "lastDuelAt",
      cooldownMs: DUEL_COOLDOWN_MS,
    },
  );
}

/** Notify that the Club Safe is nearly full (≥80%). */
export async function notifyVaultNearlyFull(
  userId: string,
): Promise<SendResult> {
  if (!(await assertHuman(userId))) return { sent: 0, pruned: 0 };

  return deliver(
    userId,
    {
      type: "vault_nearly_full",
      title: "Safe almost full",
      body: "Collect and withdraw Club Funds before income is capped.",
      url: "/club",
    },
    {
      prefer: "vaultNearlyFull",
      webCooldown: "lastVaultPushAt",
      tgCooldown: "lastVaultAt",
      cooldownMs: VAULT_COOLDOWN_MS,
    },
  );
}

/** Daily newspaper claim is available again. */
export async function notifyNewspaperReady(
  userId: string,
): Promise<SendResult> {
  if (!(await assertHuman(userId))) return { sent: 0, pruned: 0 };

  return deliver(
    userId,
    {
      type: "newspaper_ready",
      title: "Fresh edition!",
      body: "Today's Footballica Times is on the stand — claim your booster.",
      url: "/club",
    },
    {
      prefer: "newspaperReady",
      webCooldown: "lastNewspaperPushAt",
      tgCooldown: "lastNewspaperAt",
      cooldownMs: NEWSPAPER_COOLDOWN_MS,
    },
  );
}

/** Stamina bar is full — ready for another match. */
export async function notifyStaminaFull(userId: string): Promise<SendResult> {
  if (!(await assertHuman(userId))) return { sent: 0, pruned: 0 };

  return deliver(
    userId,
    {
      type: "stamina_full",
      title: "Squad rested",
      body: "Stamina is full — kick off a match from Play.",
      url: "/play",
    },
    {
      prefer: "staminaFull",
      webCooldown: "lastStaminaPushAt",
      tgCooldown: "lastStaminaAt",
      cooldownMs: STAMINA_COOLDOWN_MS,
    },
  );
}
