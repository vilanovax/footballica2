import "server-only";

import { prisma } from "@/lib/prisma";
import { isWebPushReady } from "@/lib/push/webPush";
import { isTelegramReady } from "@/lib/push/telegram";

export type NotifyPrefField =
  | "duelYourTurn"
  | "vaultNearlyFull"
  | "newspaperReady"
  | "staminaFull";

export function isNotifyReady(): boolean {
  return isWebPushReady() || isTelegramReady();
}

/**
 * Union of humans who opted into a pref on Web Push and/or Telegram.
 * Keeps cron scanners channel-agnostic.
 */
export async function listNotifyCandidateUserIds(
  prefer: NotifyPrefField,
  limit: number,
): Promise<string[]> {
  const [web, tg] = await Promise.all([
    prisma.pushSubscription.findMany({
      where: { [prefer]: true },
      select: { userId: true },
      distinct: ["userId"],
      take: limit * 2,
    }),
    isTelegramReady()
      ? prisma.telegramNotifyLink.findMany({
          where: { enabled: true, [prefer]: true },
          select: { userId: true },
          take: limit * 2,
        })
      : Promise.resolve([] as { userId: string }[]),
  ]);

  const ids = [...new Set([...web, ...tg].map((r) => r.userId))];
  return ids.slice(0, limit);
}
