"use server";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { requireUserClub } from "@/lib/player/current";
import {
  canUserAct,
  describeTurn,
  statusAfterAttackSubmit,
} from "@/lib/duel/fsm";
import { parseMemoryBoard } from "@/lib/duel/memoryBoard";
import {
  gradeMemoryAttempt,
  isMemorySubmitTooLate,
} from "@/lib/duel/memoryGrade";
import type { MemoryAttemptSubmission } from "@/lib/duel/memoryTypes";
import { randomBotDelayMs, scheduleBotPlayAt } from "@/lib/duel/bot";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { creditDuelTurnMissions } from "@/lib/game/missionEngine";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

export type SubmitMemoryAttackResult =
  | { ok: true; duel: DuelSnapshot; missions?: EvaluateMissionsResult }
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
 * Submit MEMORY attack half. Scores pairsFound → attackCorrect.
 */
export async function submitMemoryAttack(
  duelId: string,
  attempt: MemoryAttemptSubmission,
): Promise<SubmitMemoryAttackResult> {
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
    if (turn.kind !== "attack" || turn.roundNumber == null) {
      return { ok: false, error: "not_your_turn" };
    }

    const round = duel.rounds.find((r) => r.roundNumber === turn.roundNumber);
    if (!round || round.roundType !== "MEMORY") {
      return { ok: false, error: "not_memory" };
    }
    if (round.attackSubmittedAt) {
      return { ok: false, error: "already_submitted" };
    }

    const board = parseMemoryBoard(round.boardJson);
    if (!board) return { ok: false, error: "not_found" };

    const config = await getGameConfig();
    const now = new Date();

    // Stamp start if client skipped begin (clock from first submit attempt).
    let startedAt = round.attackStartedAt;
    if (!startedAt) {
      startedAt = now;
      await prisma.duelRound.update({
        where: { id: round.id },
        data: { attackStartedAt: now },
      });
    } else if (
      isMemorySubmitTooLate(startedAt, config.duel.memoryTurnMs, now)
    ) {
      return { ok: false, error: "turn_expired" };
    }

    const log = gradeMemoryAttempt(board, attempt ?? { flips: [], matches: [], durationMs: 0 });
    const attackCorrect = log.pairsFound;
    const nextStatus = statusAfterAttackSubmit(turn.roundNumber);

    const isChallengerAttack = user.id === duel.challengerId;
    const challengerCorrect =
      duel.challengerCorrect + (isChallengerAttack ? attackCorrect : 0);
    const opponentCorrect =
      duel.opponentCorrect + (!isChallengerAttack ? attackCorrect : 0);

    let botPlayAt: Date | null = duel.botPlayAt;
    let turnUserId: string | null = duel.opponentId;
    if (nextStatus === "WAITING_B" && duel.isBotOpponent) {
      botPlayAt = scheduleBotPlayAt(now, await randomBotDelayMs());
      turnUserId = duel.opponentId;
    } else if (nextStatus === "WAITING_A") {
      turnUserId = duel.challengerId;
      botPlayAt = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.duelRound.update({
        where: { id: round.id },
        data: {
          attackAnswers: log,
          attackCorrect,
          attackSubmittedAt: now,
          attackStartedAt: startedAt,
        },
      });

      return tx.duelMatch.update({
        where: { id: duel.id },
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
        userId: user.id,
        duelId: duel.id,
        roundNumber: turn.roundNumber,
        role: "attack",
        goals: attackCorrect,
      });
      if (credited) missions = credited;
    } catch (err) {
      console.error("creditDuelTurnMissions after memory attack", err);
    }

    return {
      ok: true,
      duel: toDuelSnapshot(updated, user.id),
      missions,
    };
  } catch (err) {
    console.error("submitMemoryAttack failed", err);
    return { ok: false, error: "server_error" };
  }
}
