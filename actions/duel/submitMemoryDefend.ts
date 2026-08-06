"use server";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { requireUserClub } from "@/lib/player/current";
import {
  canUserAct,
  describeTurn,
  statusAfterDefendSubmit,
} from "@/lib/duel/fsm";
import { resolveDuelWinner, tallyRoundWins } from "@/lib/duel/scoring";
import { parseMemoryBoard } from "@/lib/duel/memoryBoard";
import {
  gradeMemoryAttempt,
  isMemorySubmitTooLate,
} from "@/lib/duel/memoryGrade";
import type { MemoryAttemptSubmission } from "@/lib/duel/memoryTypes";
import { quizRoundCreateData } from "@/lib/duel/createQuizRound";
import {
  listDuelEligibleCategories,
  usedCategoryIdsFromRounds,
} from "@/lib/duel/draw";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import {
  creditDuelMissions,
  creditDuelTurnMissions,
} from "@/lib/game/missionEngine";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

export type SubmitMemoryDefendResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      missions?: EvaluateMissionsResult;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "not_memory"
        | "already_submitted"
        | "turn_expired"
        | "server_error";
    };

/**
 * Submit MEMORY defense half.
 * Round 1 → open Round 2 QUIZ draft for opponent (Memory already spent).
 * Round 2 → COMPLETED + winner resolve.
 */
export async function submitMemoryDefend(
  duelId: string,
  attempt: MemoryAttemptSubmission,
): Promise<SubmitMemoryDefendResult> {
  void tickDuelJobs();

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const duel = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: {
        rounds: { include: { category: true }, orderBy: { roundNumber: "asc" } },
      },
    });
    if (!duel) return { ok: false, error: "not_found" };
    if (duel.timeoutUserId === user.id) {
      return { ok: false, error: "not_your_turn" };
    }

    if (
      !canUserAct({
        status: duel.status,
        userId: user.id,
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
      })
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const turn = describeTurn(duel.status);
    if (turn.kind !== "defend" || turn.roundNumber == null) {
      return { ok: false, error: "not_your_turn" };
    }

    const round = duel.rounds.find((r) => r.roundNumber === turn.roundNumber);
    if (!round || round.roundType !== "MEMORY") {
      return { ok: false, error: "not_memory" };
    }
    if (round.defenseSubmittedAt) {
      return { ok: false, error: "already_submitted" };
    }

    const board = parseMemoryBoard(round.boardJson);
    if (!board) return { ok: false, error: "not_found" };

    const config = await getGameConfig();
    const now = new Date();

    let startedAt = round.defenseStartedAt;
    if (!startedAt) {
      startedAt = now;
      await prisma.duelRound.update({
        where: { id: round.id },
        data: { defenseStartedAt: now },
      });
    } else if (
      isMemorySubmitTooLate(startedAt, config.duel.memoryTurnMs, now)
    ) {
      return { ok: false, error: "turn_expired" };
    }

    const log = gradeMemoryAttempt(board, attempt ?? { flips: [], matches: [], durationMs: 0 });
    const defenseCorrect = log.pairsFound;
    const nextStatus = statusAfterDefendSubmit(turn.roundNumber);

    const defenderIsChallenger = user.id === duel.challengerId;
    let challengerCorrect =
      duel.challengerCorrect + (defenderIsChallenger ? defenseCorrect : 0);
    let opponentCorrect =
      duel.opponentCorrect + (!defenderIsChallenger ? defenseCorrect : 0);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.duelRound.update({
        where: { id: round.id },
        data: {
          defenseAnswers: log,
          defenseCorrect,
          defenseSubmittedAt: now,
          defenseStartedAt: startedAt,
        },
      });

      if (nextStatus === "B_ATTACKING" && duel.opponentId) {
        const quizData = await quizRoundCreateData({
          attackerId: duel.opponentId,
          roundNumber: 2,
          excludeCategoryIds: usedCategoryIdsFromRounds(duel.rounds),
        });
        await tx.duelRound.create({
          data: {
            duelId: duel.id,
            roundNumber: quizData.roundNumber,
            roundType: quizData.roundType,
            attackerId: quizData.attackerId,
            draftOptionIds: quizData.draftOptionIds,
          },
        });

        return tx.duelMatch.update({
          where: { id: duel.id },
          data: {
            status: "B_ATTACKING",
            turnUserId: duel.opponentId,
            turnDeadlineAt: new Date(
              now.getTime() + config.duel.turnHours * 60 * 60 * 1000,
            ),
            challengerCorrect,
            opponentCorrect,
          },
          include: duelSnapshotInclude,
        });
      }

      const roundWins = tallyRoundWins(
        duel.rounds.map((r) => {
          const isCurrent = r.id === round.id;
          return {
            attackerId: r.attackerId,
            attackCorrect: r.attackCorrect,
            defenseCorrect: isCurrent ? defenseCorrect : r.defenseCorrect,
            complete:
              Boolean(r.attackSubmittedAt) &&
              (isCurrent || Boolean(r.defenseSubmittedAt)),
          };
        }),
        duel.challengerId,
      );
      const winnerId = resolveDuelWinner({
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
        challengerCorrect,
        opponentCorrect,
        challengerRoundWins: roundWins.challenger,
        opponentRoundWins: roundWins.opponent,
      });

      let weeklyXpAwarded = duel.weeklyXpAwarded;
      if (winnerId && !weeklyXpAwarded && config.duel.winWeeklyXp > 0) {
        await tx.user.update({
          where: { id: winnerId },
          data: { weeklyXp: { increment: config.duel.winWeeklyXp } },
        });
        weeklyXpAwarded = true;
      }

      return tx.duelMatch.update({
        where: { id: duel.id },
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
    const snapshot = toDuelSnapshot(updated, user.id, draftOptions);
    let missions: EvaluateMissionsResult | undefined;
    try {
      const turnResult = await creditDuelTurnMissions({
        userId: user.id,
        duelId: duel.id,
        roundNumber: turn.roundNumber,
        role: "defend",
        goals: defenseCorrect,
      });
      if (turnResult) missions = turnResult;
    } catch (err) {
      console.error("creditDuelTurnMissions after memory defend", err);
    }

    if (updated.status === "COMPLETED") {
      try {
        const map = await creditDuelMissions({
          duelId: updated.id,
          challengerId: updated.challengerId,
          opponentId: updated.opponentId,
          winnerId: updated.winnerId,
        });
        missions = map.get(user.id) ?? missions;
      } catch (err) {
        console.error("creditDuelMissions after memory defend", err);
      }
    }

    return { ok: true, duel: snapshot, missions };
  } catch (err) {
    console.error("submitMemoryDefend failed", err);
    return { ok: false, error: "server_error" };
  }
}
