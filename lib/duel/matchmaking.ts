import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { pickRandomBotUser } from "@/lib/duel/bot";
import { pickDraftCategories } from "@/lib/duel/draw";
import { computeStaminaRegen } from "@/lib/club/stamina";

type Db = typeof prisma | Prisma.TransactionClient;

type MatchingRow = {
  id: string;
  challengerId: string;
};

/**
 * Promote a timed-out MATCHING duel to a bot opponent from the Admin pool
 * (falls back to the system bot when the pool is empty).
 */
export async function assignBotToMatchingDuel(
  duelId: string,
  now = new Date(),
): Promise<boolean> {
  const config = await getGameConfig();
  // Weighted cold-start mix: more MEDIUM than EASY/HARD.
  const roll = Math.random();
  const preferred =
    roll < 0.25 ? "EASY" : roll < 0.85 ? "MEDIUM" : ("HARD" as const);
  const bot = await pickRandomBotUser(preferred);

  return prisma.$transaction(async (tx) => {
    const duel = await tx.duelMatch.findUnique({
      where: { id: duelId },
      include: { rounds: true },
    });
    if (!duel || duel.status !== "MATCHING" || duel.opponentId) return false;
    if (duel.turnDeadlineAt && duel.turnDeadlineAt > now) return false;

    // Ensure round 1 draft exists (should already from startDuel).
    if (duel.rounds.length === 0) {
      const draft = await pickDraftCategories(config.duel.draftChoices);
      await tx.duelRound.create({
        data: {
          duelId: duel.id,
          roundNumber: 1,
          attackerId: duel.challengerId,
          draftOptionIds: draft.map((c) => c.id),
        },
      });
    }

    await tx.duelMatch.update({
      where: { id: duel.id },
      data: {
        opponentId: bot.id,
        isBotOpponent: true,
        status: "A_ATTACKING",
        turnUserId: duel.challengerId,
        turnDeadlineAt: new Date(
          now.getTime() + config.duel.turnHours * 60 * 60 * 1000,
        ),
        botPlayAt: null,
      },
    });
    return true;
  });
}

/**
 * Cancel a MATCHING duel that never found anyone and refund stamina.
 * Used when absorbing a duplicate enqueue into an older human match.
 */
export async function cancelMatchingDuel(
  duelId: string,
  now = new Date(),
  opts: { refundStamina?: boolean } = {},
): Promise<boolean> {
  const refundStamina = opts.refundStamina ?? true;

  return prisma.$transaction(async (tx) => {
    const duel = await tx.duelMatch.findUnique({ where: { id: duelId } });
    if (!duel || duel.status !== "MATCHING") return false;

    if (refundStamina && duel.staminaSpent > 0) {
      const club = await tx.club.findUnique({
        where: { userId: duel.challengerId },
      });
      if (club) {
        const regen = computeStaminaRegen(club, now);
        const restored = Math.min(
          club.maxStamina,
          regen.stamina + duel.staminaSpent,
        );
        await tx.club.update({
          where: { id: club.id },
          data: {
            stamina: restored,
            lastStaminaUpdate:
              restored >= club.maxStamina ? now : regen.lastStaminaUpdate,
          },
        });
      }
    }

    await tx.duelMatch.update({
      where: { id: duel.id },
      data: {
        status: "EXPIRED",
        turnUserId: null,
        turnDeadlineAt: null,
        botPlayAt: null,
        finishedAt: now,
        winnerId: null,
      },
    });
    return true;
  });
}

async function lockOpenMatching(
  tx: Db,
  now: Date,
  limit: number,
  excludeUserId?: string,
): Promise<MatchingRow[]> {
  if (excludeUserId) {
    return tx.$queryRaw<MatchingRow[]>(Prisma.sql`
      SELECT id, "challengerId"
      FROM "DuelMatch"
      WHERE status = CAST('MATCHING' AS "DuelStatus")
        AND "opponentId" IS NULL
        AND "challengerId" <> ${excludeUserId}
        AND ("turnDeadlineAt" IS NULL OR "turnDeadlineAt" > ${now})
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `);
  }

  return tx.$queryRaw<MatchingRow[]>(Prisma.sql`
    SELECT id, "challengerId"
    FROM "DuelMatch"
    WHERE status = CAST('MATCHING' AS "DuelStatus")
      AND "opponentId" IS NULL
      AND ("turnDeadlineAt" IS NULL OR "turnDeadlineAt" > ${now})
    ORDER BY "createdAt" ASC
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  `);
}

/**
 * Pair two waiting humans: older duel keeps the match, younger is expired
 * without stamina refund (both already paid to play).
 * Returns number of pairs formed.
 */
export async function pairOpenMatchingDuels(
  limit = 20,
  now = new Date(),
): Promise<number> {
  const config = await getGameConfig();
  let paired = 0;

  for (let i = 0; i < limit; i++) {
    const ok = await prisma.$transaction(async (tx) => {
      const rows = await lockOpenMatching(tx, now, 2);
      if (rows.length < 2) return false;

      const [older, younger] = rows;
      if (!older || !younger) return false;
      if (older.challengerId === younger.challengerId) return false;

      const turnDeadlineAt = new Date(
        now.getTime() + config.duel.turnHours * 60 * 60 * 1000,
      );

      const claimed = await tx.duelMatch.updateMany({
        where: {
          id: older.id,
          status: "MATCHING",
          opponentId: null,
        },
        data: {
          opponentId: younger.challengerId,
          isBotOpponent: false,
          status: "A_ATTACKING",
          turnUserId: older.challengerId,
          turnDeadlineAt,
          botPlayAt: null,
        },
      });
      if (claimed.count === 0) return false;

      await tx.duelMatch.updateMany({
        where: {
          id: younger.id,
          status: "MATCHING",
          opponentId: null,
        },
        data: {
          status: "EXPIRED",
          turnUserId: null,
          turnDeadlineAt: null,
          botPlayAt: null,
          finishedAt: now,
          winnerId: null,
        },
      });

      return true;
    });

    if (!ok) break;
    paired += 1;
  }

  return paired;
}

/**
 * After enqueueing a MATCHING duel, try to absorb into an older waiting human
 * (fixes the double-create race where both miss claim).
 * Returns the live duel id the player should open (keeper or self).
 */
export async function absorbMatchingIfPossible(params: {
  myDuelId: string;
  userId: string;
  turnHours: number;
  now?: Date;
}): Promise<string> {
  const now = params.now ?? new Date();

  const keeperId = await prisma.$transaction(async (tx) => {
    const mine = await tx.duelMatch.findUnique({
      where: { id: params.myDuelId },
    });
    if (!mine || mine.status !== "MATCHING" || mine.opponentId) {
      return params.myDuelId;
    }

    const others = await lockOpenMatching(tx, now, 1, params.userId);
    const older = others[0];
    if (!older) return params.myDuelId;

    const turnDeadlineAt = new Date(
      now.getTime() + params.turnHours * 60 * 60 * 1000,
    );

    const claimed = await tx.duelMatch.updateMany({
      where: {
        id: older.id,
        status: "MATCHING",
        opponentId: null,
      },
      data: {
        opponentId: params.userId,
        isBotOpponent: false,
        status: "A_ATTACKING",
        turnUserId: older.challengerId,
        turnDeadlineAt,
        botPlayAt: null,
      },
    });
    if (claimed.count === 0) return params.myDuelId;

    // Absorb: expire my enqueue — stamina already spent on this match.
    await tx.duelMatch.updateMany({
      where: {
        id: params.myDuelId,
        status: "MATCHING",
        opponentId: null,
      },
      data: {
        status: "EXPIRED",
        turnUserId: null,
        turnDeadlineAt: null,
        botPlayAt: null,
        finishedAt: now,
        winnerId: null,
      },
    });

    return older.id;
  });

  return keeperId;
}

/**
 * If this MATCHING row was absorbed into an older duel, return that live duel id.
 */
export async function resolveAbsorbedMatchingDuel(params: {
  duelId: string;
  userId: string;
}): Promise<string | null> {
  const duel = await prisma.duelMatch.findUnique({
    where: { id: params.duelId },
    select: {
      id: true,
      status: true,
      challengerId: true,
      opponentId: true,
      winnerId: true,
      finishedAt: true,
      createdAt: true,
    },
  });
  if (!duel) return null;
  if (duel.status !== "EXPIRED") return null;
  if (duel.winnerId) return null;
  if (duel.challengerId !== params.userId) return null;
  if (duel.opponentId) return null;

  const since = new Date(duel.createdAt.getTime() - 60_000);
  const live = await prisma.duelMatch.findFirst({
    where: {
      opponentId: params.userId,
      isBotOpponent: false,
      status: { notIn: ["COMPLETED", "EXPIRED", "FORFEIT"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return live?.id ?? null;
}

/** MATCHING past deadline → assign bot so the challenger can play. */
export async function processMatchingTimeouts(limit = 40): Promise<number> {
  const now = new Date();

  const due = await prisma.duelMatch.findMany({
    where: {
      status: "MATCHING",
      opponentId: null,
      turnDeadlineAt: { lte: now },
    },
    select: { id: true },
    take: limit,
    orderBy: { turnDeadlineAt: "asc" },
  });

  let n = 0;
  for (const row of due) {
    const ok = await assignBotToMatchingDuel(row.id, now);
    if (ok) n += 1;
  }
  return n;
}

/**
 * Claim the oldest open MATCHING duel as a human opponent.
 * Returns the duel id when claimed, or null if none available / race lost.
 */
export async function claimOpenMatchingDuel(params: {
  userId: string;
  clubId: string;
  staminaCost: number;
  turnHours: number;
  now?: Date;
}): Promise<string | null> {
  const now = params.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const openRows = await lockOpenMatching(tx, now, 1, params.userId);
    const open = openRows[0];
    if (!open) return null;

    const live = await tx.club.findUniqueOrThrow({
      where: { id: params.clubId },
    });
    const regen = computeStaminaRegen(live, now);
    if (regen.stamina < params.staminaCost) {
      throw new Error("no_stamina");
    }
    const spent = regen.stamina - params.staminaCost;
    const staminaAnchor =
      regen.stamina >= live.maxStamina ? now : regen.lastStaminaUpdate;

    await tx.club.update({
      where: { id: live.id },
      data: {
        stamina: spent,
        lastStaminaUpdate: staminaAnchor,
      },
    });

    const claimed = await tx.duelMatch.updateMany({
      where: {
        id: open.id,
        status: "MATCHING",
        opponentId: null,
      },
      data: {
        opponentId: params.userId,
        isBotOpponent: false,
        status: "A_ATTACKING",
        turnUserId: open.challengerId,
        turnDeadlineAt: new Date(
          now.getTime() + params.turnHours * 60 * 60 * 1000,
        ),
        botPlayAt: null,
      },
    });

    if (claimed.count === 0) {
      // Race lost — refund joiner stamina.
      await tx.club.update({
        where: { id: live.id },
        data: {
          stamina: regen.stamina,
          lastStaminaUpdate: live.lastStaminaUpdate,
        },
      });
      return null;
    }

    return open.id;
  });
}
