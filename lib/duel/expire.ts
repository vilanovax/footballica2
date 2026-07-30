import "server-only";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { isDuelTerminal } from "@/lib/duel/types";
import { creditDuelMissions } from "@/lib/game/missionEngine";
import { runBotTurnIfDue } from "@/lib/duel/bot";
import { runShadowBotTakeover } from "@/lib/duel/shadowBot";

const EXPIREABLE_STATUSES = [
  "A_ATTACKING",
  "WAITING_B",
  "B_DEFENDING",
  "B_ATTACKING",
  "WAITING_A",
  "A_DEFENDING",
] as const;

/**
 * Lazy turn timeout. Behavior from GameConfig.duel.timeoutAction:
 * - AUTO_FORFEIT — AFK loses; active player wins immediately.
 * - SHADOW_BOT — fabricate AFK turns; active player finishes normally.
 */
export async function expireDuelIfDue(
  duelId: string,
  now = new Date(),
): Promise<boolean> {
  const config = await getGameConfig();

  const duel = await prisma.duelMatch.findUnique({ where: { id: duelId } });
  if (!duel) return false;
  if (isDuelTerminal(duel.status)) return false;
  if (!duel.turnDeadlineAt || duel.turnDeadlineAt > now) return false;
  if (duel.status === "MATCHING") return false;
  if (
    !EXPIREABLE_STATUSES.includes(
      duel.status as (typeof EXPIREABLE_STATUSES)[number],
    )
  ) {
    return false;
  }

  // Pure bot opponent still scheduled — let bot runner handle it.
  if (duel.isBotOpponent && !duel.shadowBotActive) {
    if (duel.botPlayAt && duel.botPlayAt > now) return false;
    const botOk = await runBotTurnIfDue(duelId, now);
    if (botOk) return true;
    // Fall through to forfeit if bot couldn't play.
  }

  const timedOutId = duel.turnUserId;
  if (!timedOutId) return false;

  // Already shadow-controlled AFK still somehow overdue — keep fabricating.
  if (
    config.duel.timeoutAction === "SHADOW_BOT" ||
    duel.shadowBotActive
  ) {
    return runShadowBotTakeover(duelId, timedOutId, now);
  }

  return autoForfeitDuel(duelId, timedOutId, now);
}

async function autoForfeitDuel(
  duelId: string,
  timedOutId: string,
  now: Date,
): Promise<boolean> {
  const config = await getGameConfig();

  return prisma
    .$transaction(async (tx) => {
      const duel = await tx.duelMatch.findUnique({ where: { id: duelId } });
      if (!duel) return false;
      if (isDuelTerminal(duel.status)) return false;
      if (!duel.turnDeadlineAt || duel.turnDeadlineAt > now) return false;

      let winnerId: string | null = null;
      if (duel.challengerId === timedOutId) {
        winnerId = duel.opponentId;
      } else if (duel.opponentId === timedOutId) {
        winnerId = duel.challengerId;
      }

      let weeklyXpAwarded = duel.weeklyXpAwarded;
      if (winnerId && !weeklyXpAwarded && config.duel.winWeeklyXp > 0) {
        await tx.user.update({
          where: { id: winnerId },
          data: { weeklyXp: { increment: config.duel.winWeeklyXp } },
        });
        weeklyXpAwarded = true;
      }

      await tx.duelMatch.update({
        where: { id: duel.id },
        data: {
          status: "FORFEIT",
          turnUserId: null,
          turnDeadlineAt: null,
          botPlayAt: null,
          finishedAt: now,
          winnerId,
          weeklyXpAwarded,
          timeoutUserId: timedOutId,
          shadowBotActive: false,
        },
      });
      return true;
    })
    .then(async (ok) => {
      if (!ok) return false;
      const finished = await prisma.duelMatch.findUnique({
        where: { id: duelId },
        select: {
          id: true,
          status: true,
          challengerId: true,
          opponentId: true,
          winnerId: true,
        },
      });
      if (finished?.status === "FORFEIT") {
        try {
          await creditDuelMissions({
            duelId: finished.id,
            challengerId: finished.challengerId,
            opponentId: finished.opponentId,
            winnerId: finished.winnerId,
          });
        } catch (err) {
          console.error("creditDuelMissions after forfeit", err);
        }
      }
      return true;
    });
}

/** Batch-process overdue human turns (cron / opportunistic inbox fetch). */
export async function processExpiredDuels(limit = 80): Promise<number> {
  const now = new Date();
  const due = await prisma.duelMatch.findMany({
    where: {
      status: { in: [...EXPIREABLE_STATUSES] },
      turnDeadlineAt: { lte: now },
    },
    select: { id: true },
    take: limit,
    orderBy: { turnDeadlineAt: "asc" },
  });

  let n = 0;
  for (const row of due) {
    const ok = await expireDuelIfDue(row.id, now);
    if (ok) n += 1;
  }
  return n;
}
