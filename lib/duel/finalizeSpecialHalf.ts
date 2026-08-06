import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { resolveDuelWinner, tallyRoundWins } from "@/lib/duel/scoring";
import {
  statusAfterAttackSubmit,
  statusAfterDefendSubmit,
} from "@/lib/duel/fsm";
import { quizRoundCreateData } from "@/lib/duel/createQuizRound";
import {
  listDuelEligibleCategories,
  usedCategoryIdsFromRounds,
} from "@/lib/duel/draw";
import { randomBotDelayMs, scheduleBotPlayAt } from "@/lib/duel/bot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import {
  creditDuelMissions,
  creditDuelTurnMissions,
} from "@/lib/game/missionEngine";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

type RoundLite = {
  id: string;
  roundNumber: number;
  attackerId: string;
  categoryId: string | null;
  attackCorrect: number;
  defenseCorrect: number;
  attackSubmittedAt: Date | null;
  defenseSubmittedAt: Date | null;
};

type DuelLite = {
  id: string;
  challengerId: string;
  opponentId: string | null;
  challengerCorrect: number;
  opponentCorrect: number;
  isBotOpponent: boolean;
  botPlayAt: Date | null;
  weeklyXpAwarded: boolean;
  rounds: RoundLite[];
};

/**
 * Persist a completed special attack half and advance the duel FSM.
 */
export async function finalizeSpecialAttack(opts: {
  duel: DuelLite;
  round: RoundLite;
  userId: string;
  score: number;
  answers: Prisma.InputJsonValue;
  now?: Date;
}): Promise<{ duel: DuelSnapshot; missions?: EvaluateMissionsResult }> {
  const now = opts.now ?? new Date();
  const config = await getGameConfig();
  const nextStatus = statusAfterAttackSubmit(opts.round.roundNumber);
  const isChallengerAttack = opts.userId === opts.duel.challengerId;
  const challengerCorrect =
    opts.duel.challengerCorrect + (isChallengerAttack ? opts.score : 0);
  const opponentCorrect =
    opts.duel.opponentCorrect + (!isChallengerAttack ? opts.score : 0);

  let botPlayAt: Date | null = opts.duel.botPlayAt;
  let turnUserId: string | null = opts.duel.opponentId;
  if (nextStatus === "WAITING_B" && opts.duel.isBotOpponent) {
    botPlayAt = scheduleBotPlayAt(now, await randomBotDelayMs());
    turnUserId = opts.duel.opponentId;
  } else if (nextStatus === "WAITING_A") {
    turnUserId = opts.duel.challengerId;
    botPlayAt = null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.duelRound.update({
      where: { id: opts.round.id },
      data: {
        attackAnswers: opts.answers,
        attackCorrect: opts.score,
        attackSubmittedAt: now,
      },
    });

    return tx.duelMatch.update({
      where: { id: opts.duel.id },
      data: {
        status: nextStatus,
        turnUserId,
        turnDeadlineAt: new Date(
          now.getTime() + config.duel.turnHours * 60 * 60 * 1000,
        ),
        botPlayAt,
        challengerCorrect,
        opponentCorrect,
      },
      include: duelSnapshotInclude,
    });
  });

  let missions: EvaluateMissionsResult | undefined;
  try {
    const credited = await creditDuelTurnMissions({
      userId: opts.userId,
      duelId: opts.duel.id,
      roundNumber: opts.round.roundNumber,
      role: "attack",
      goals: opts.score,
    });
    if (credited) missions = credited;
  } catch (err) {
    console.error("creditDuelTurnMissions after special attack", err);
  }

  return {
    duel: toDuelSnapshot(updated, opts.userId, { liveModes: config.liveModes }),
    missions,
  };
}

/**
 * Persist a completed special defend half; open R2 QUIZ or complete the duel.
 */
export async function finalizeSpecialDefend(opts: {
  duel: DuelLite;
  round: RoundLite;
  userId: string;
  score: number;
  answers: Prisma.InputJsonValue;
  now?: Date;
}): Promise<{ duel: DuelSnapshot; missions?: EvaluateMissionsResult }> {
  const now = opts.now ?? new Date();
  const config = await getGameConfig();
  const nextStatus = statusAfterDefendSubmit(opts.round.roundNumber);
  const defenderIsChallenger = opts.userId === opts.duel.challengerId;
  const challengerCorrect =
    opts.duel.challengerCorrect + (defenderIsChallenger ? opts.score : 0);
  const opponentCorrect =
    opts.duel.opponentCorrect + (!defenderIsChallenger ? opts.score : 0);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.duelRound.update({
      where: { id: opts.round.id },
      data: {
        defenseAnswers: opts.answers,
        defenseCorrect: opts.score,
        defenseSubmittedAt: now,
      },
    });

    if (nextStatus === "B_ATTACKING" && opts.duel.opponentId) {
      const quizData = await quizRoundCreateData({
        attackerId: opts.duel.opponentId,
        roundNumber: 2,
        excludeCategoryIds: usedCategoryIdsFromRounds(opts.duel.rounds),
      });
      await tx.duelRound.create({
        data: {
          duelId: opts.duel.id,
          roundNumber: quizData.roundNumber,
          roundType: quizData.roundType,
          attackerId: quizData.attackerId,
          draftOptionIds: quizData.draftOptionIds,
        },
      });

      return tx.duelMatch.update({
        where: { id: opts.duel.id },
        data: {
          status: "B_ATTACKING",
          turnUserId: opts.duel.opponentId,
          turnDeadlineAt: new Date(
            now.getTime() + config.duel.turnHours * 60 * 60 * 1000,
          ),
          botPlayAt: opts.duel.isBotOpponent
            ? scheduleBotPlayAt(now, await randomBotDelayMs())
            : null,
          challengerCorrect,
          opponentCorrect,
        },
        include: duelSnapshotInclude,
      });
    }

    const roundWins = tallyRoundWins(
      opts.duel.rounds.map((r) => {
        const isCurrent = r.id === opts.round.id;
        return {
          attackerId: r.attackerId,
          attackCorrect: r.attackCorrect,
          defenseCorrect: isCurrent ? opts.score : r.defenseCorrect,
          complete:
            Boolean(r.attackSubmittedAt) &&
            (isCurrent || Boolean(r.defenseSubmittedAt)),
        };
      }),
      opts.duel.challengerId,
    );
    const winnerId = resolveDuelWinner({
      challengerId: opts.duel.challengerId,
      opponentId: opts.duel.opponentId,
      challengerCorrect,
      opponentCorrect,
      challengerRoundWins: roundWins.challenger,
      opponentRoundWins: roundWins.opponent,
    });

    let weeklyXpAwarded = opts.duel.weeklyXpAwarded;
    if (winnerId && !weeklyXpAwarded && config.duel.winWeeklyXp > 0) {
      await tx.user.update({
        where: { id: winnerId },
        data: { weeklyXp: { increment: config.duel.winWeeklyXp } },
      });
      weeklyXpAwarded = true;
    }

    return tx.duelMatch.update({
      where: { id: opts.duel.id },
      data: {
        status: "COMPLETED",
        turnUserId: null,
        turnDeadlineAt: null,
        botPlayAt: null,
        finishedAt: now,
        winnerId,
        challengerCorrect,
        opponentCorrect,
        weeklyXpAwarded,
      },
      include: duelSnapshotInclude,
    });
  });

  let draftOptions = undefined;
  if (updated.status === "B_ATTACKING") {
    const r2 = updated.rounds.find((r) => r.roundNumber === 2);
    const draftIds = Array.isArray(r2?.draftOptionIds)
      ? (r2!.draftOptionIds as string[])
      : [];
    const cats = await listDuelEligibleCategories();
    draftOptions = cats.filter((c) => draftIds.includes(c.id));
  }

  const snapshot = toDuelSnapshot(updated, opts.userId, {
    draftOptions,
    liveModes: config.liveModes,
  });
  let missions: EvaluateMissionsResult | undefined;
  try {
    const turnResult = await creditDuelTurnMissions({
      userId: opts.userId,
      duelId: opts.duel.id,
      roundNumber: opts.round.roundNumber,
      role: "defend",
      goals: opts.score,
    });
    if (turnResult) missions = turnResult;
  } catch (err) {
    console.error("creditDuelTurnMissions after special defend", err);
  }

  if (updated.status === "COMPLETED") {
    try {
      const map = await creditDuelMissions({
        duelId: updated.id,
        challengerId: updated.challengerId,
        opponentId: updated.opponentId,
        winnerId: updated.winnerId,
      });
      missions = map.get(opts.userId) ?? missions;
    } catch (err) {
      console.error("creditDuelMissions after special defend", err);
    }
  }

  return { duel: snapshot, missions };
}
