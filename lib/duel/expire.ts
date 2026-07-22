import "server-only";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { isDuelTerminal } from "@/lib/duel/types";
import { creditDuelMissions } from "@/lib/game/missionEngine";

const EXPIREABLE_STATUSES = [
  "A_ATTACKING",
  "WAITING_B",
  "B_DEFENDING",
  "B_ATTACKING",
  "WAITING_A",
  "A_DEFENDING",
] as const;

/**
 * Walkover forfeit: the player who owned the turn (`turnUserId`) timed out.
 * Status → FORFEIT (EXPIRED is reserved for cancelled MATCHING / absorb).
 * Awards weekly XP like a normal win.
 */
export async function expireDuelIfDue(
  duelId: string,
  now = new Date(),
): Promise<boolean> {
  const config = await getGameConfig();

  return prisma
    .$transaction(async (tx) => {
      const duel = await tx.duelMatch.findUnique({ where: { id: duelId } });
      if (!duel) return false;
      if (isDuelTerminal(duel.status)) return false;
      if (!duel.turnDeadlineAt || duel.turnDeadlineAt > now) return false;

      // MATCHING timeouts are handled by matchmaking fallback (bot / cancel).
      if (duel.status === "MATCHING") return false;
      if (
        !EXPIREABLE_STATUSES.includes(
          duel.status as (typeof EXPIREABLE_STATUSES)[number],
        )
      ) {
        return false;
      }

      // Bot still scheduled to play — don't forfeit early (misconfigured
      // turnHours < botDelay could otherwise walkover a waiting bot).
      if (duel.isBotOpponent && duel.botPlayAt && duel.botPlayAt > now) {
        return false;
      }

      const timedOutId = duel.turnUserId;
      let winnerId: string | null = null;
      if (timedOutId && duel.challengerId === timedOutId) {
        winnerId = duel.opponentId;
      } else if (timedOutId && duel.opponentId === timedOutId) {
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

/** Batch-forfeit overdue human turns (cron / opportunistic). */
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
