import "server-only";

import { prisma } from "@/lib/prisma";
import { loadBusinessSnapshot } from "@/lib/club/businessService";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { canClaimNews } from "@/lib/boosters/boosters";
import {
  notifyDuelYourTurn,
  notifyNewspaperReady,
  notifyStaminaFull,
  notifyVaultNearlyFull,
} from "@/lib/push/send";
import { isWebPushReady } from "@/lib/push/webPush";

const VAULT_RATIO = 0.8;

/**
 * After duel jobs tick: notify humans whose turn is live and who have not
 * been pushed recently (cooldown lives inside notifyDuelYourTurn).
 */
export async function scanDuelYourTurnPushes(
  limit = 40,
): Promise<{ candidates: number; sent: number }> {
  if (!isWebPushReady()) return { candidates: 0, sent: 0 };

  const duels = await prisma.duelMatch.findMany({
    where: {
      turnUserId: { not: null },
      status: {
        notIn: ["COMPLETED", "EXPIRED", "FORFEIT", "MATCHING"],
      },
    },
    select: { id: true, turnUserId: true },
    take: limit * 2,
    orderBy: { updatedAt: "desc" },
  });

  const turnIds = [
    ...new Set(
      duels.map((d) => d.turnUserId).filter((id): id is string => Boolean(id)),
    ),
  ];
  const bots = await prisma.user.findMany({
    where: { id: { in: turnIds }, isBot: true },
    select: { id: true },
  });
  const botSet = new Set(bots.map((b) => b.id));

  let sent = 0;
  let candidates = 0;
  for (const d of duels) {
    if (!d.turnUserId || botSet.has(d.turnUserId)) continue;
    candidates += 1;
    if (candidates > limit) break;
    const res = await notifyDuelYourTurn(d.turnUserId, d.id);
    sent += res.sent;
  }
  return { candidates, sent };
}

/**
 * Notify-only vault scan — never mints Funds (ADR 003).
 * Settles snapshot and pushes when Safe fill ≥ 80%.
 */
export async function scanVaultNearlyFullPushes(
  limit = 30,
): Promise<{ candidates: number; sent: number }> {
  if (!isWebPushReady()) return { candidates: 0, sent: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: { vaultNearlyFull: true },
    select: { userId: true },
    distinct: ["userId"],
    take: limit,
  });

  let sent = 0;
  let candidates = 0;

  for (const { userId } of subs) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, xp: true, isBot: true, club: true },
    });
    if (!user?.club || user.isBot) continue;

    const { business } = await loadBusinessSnapshot(user.club, user.xp, prisma);
    if (business.vaultCap <= 0) continue;
    if (business.vaultFillRatio < VAULT_RATIO) continue;
    if (business.vaultBalance <= 0) continue;

    candidates += 1;
    const res = await notifyVaultNearlyFull(userId);
    sent += res.sent;
  }

  return { candidates, sent };
}

/**
 * Daily newspaper is claimable again (Tehran day gate).
 */
export async function scanNewspaperReadyPushes(
  limit = 40,
): Promise<{ candidates: number; sent: number }> {
  if (!isWebPushReady()) return { candidates: 0, sent: 0 };

  const now = new Date();
  const subs = await prisma.pushSubscription.findMany({
    where: { newspaperReady: true },
    select: { userId: true },
    distinct: ["userId"],
    take: limit,
  });

  let sent = 0;
  let candidates = 0;

  for (const { userId } of subs) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isBot: true,
        club: { select: { lastNewsClaim: true } },
      },
    });
    if (!user?.club || user.isBot) continue;
    if (!canClaimNews(user.club.lastNewsClaim, now)) continue;

    candidates += 1;
    const res = await notifyNewspaperReady(userId);
    sent += res.sent;
  }

  return { candidates, sent };
}

/**
 * Passive stamina has regenerated to full — nudge toward Play.
 */
export async function scanStaminaFullPushes(
  limit = 40,
): Promise<{ candidates: number; sent: number }> {
  if (!isWebPushReady()) return { candidates: 0, sent: 0 };

  const now = new Date();
  const subs = await prisma.pushSubscription.findMany({
    where: { staminaFull: true },
    select: { userId: true },
    distinct: ["userId"],
    take: limit,
  });

  let sent = 0;
  let candidates = 0;

  for (const { userId } of subs) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isBot: true,
        club: {
          select: {
            stamina: true,
            maxStamina: true,
            lastStaminaUpdate: true,
            medicalLevel: true,
          },
        },
      },
    });
    if (!user?.club || user.isBot) continue;

    const regen = computeStaminaRegen(
      {
        stamina: user.club.stamina,
        maxStamina: user.club.maxStamina,
        lastStaminaUpdate: user.club.lastStaminaUpdate,
        medicalLevel: user.club.medicalLevel,
      },
      now,
    );
    if (regen.stamina < user.club.maxStamina) continue;

    candidates += 1;
    const res = await notifyStaminaFull(userId);
    sent += res.sent;
  }

  return { candidates, sent };
}
