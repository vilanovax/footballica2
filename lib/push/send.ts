import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureWebPushConfigured, webpush } from "@/lib/push/webPush";
import type { PushPayload } from "@/lib/push/types";

const DUEL_COOLDOWN_MS = 2 * 60_000;
const VAULT_COOLDOWN_MS = 12 * 60 * 60_000;

type SendResult = { sent: number; pruned: number };

async function deliver(
  userId: string,
  payload: PushPayload,
  filter: {
    prefer: "duelYourTurn" | "vaultNearlyFull";
    cooldownField: "lastDuelPushAt" | "lastVaultPushAt";
    cooldownMs: number;
  },
): Promise<SendResult> {
  if (!ensureWebPushConfigured()) return { sent: 0, pruned: 0 };

  const now = new Date();
  const subs = await prisma.pushSubscription.findMany({
    where: {
      userId,
      ...(filter.prefer === "duelYourTurn"
        ? { duelYourTurn: true }
        : { vaultNearlyFull: true }),
    },
  });

  let sent = 0;
  let pruned = 0;
  const body = JSON.stringify(payload);

  for (const sub of subs) {
    const last =
      filter.cooldownField === "lastDuelPushAt"
        ? sub.lastDuelPushAt
        : sub.lastVaultPushAt;
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

/** Notify a human that it is their Draft Duel turn. */
export async function notifyDuelYourTurn(
  userId: string,
  duelId: string,
): Promise<SendResult> {
  // Never push bots.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBot: true },
  });
  if (!user || user.isBot) return { sent: 0, pruned: 0 };

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
      cooldownField: "lastDuelPushAt",
      cooldownMs: DUEL_COOLDOWN_MS,
    },
  );
}

/** Notify that the Club Safe is nearly full (≥80%). */
export async function notifyVaultNearlyFull(
  userId: string,
): Promise<SendResult> {
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
      cooldownField: "lastVaultPushAt",
      cooldownMs: VAULT_COOLDOWN_MS,
    },
  );
}
