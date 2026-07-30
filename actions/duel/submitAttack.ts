"use server";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { requireUserClub } from "@/lib/player/current";
import {
  canUserAct,
  countCorrect,
  describeTurn,
  statusAfterAttackSubmit,
} from "@/lib/duel";
import { gradeDuelAnswers } from "@/lib/duel/grade";
import { assertNoDuelBoosters } from "@/lib/duel/fairPlay";
import type { DuelAnswerSubmission } from "@/lib/duel/types";
import { randomBotDelayMs, scheduleBotPlayAt } from "@/lib/duel/bot";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { listDuelEligibleCategories } from "@/lib/duel/draw";
import { creditDuelTurnMissions } from "@/lib/game/missionEngine";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

export type SubmitAttackResult =
  | { ok: true; duel: DuelSnapshot; missions?: EvaluateMissionsResult }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "questions_not_locked"
        | "incomplete_answers"
        | "invalid_question"
        | "already_submitted"
        | "server_error";
    };

/**
 * Submit the attacker's answers for the active round. Advances the duel FSM
 * (round 1 → WAITING_B + bot schedule; round 2 → WAITING_A).
 */
export async function submitDuelAttack(
  duelId: string,
  answers: DuelAnswerSubmission[],
): Promise<SubmitAttackResult> {
  void tickDuelJobs();
  // Fair play: reject smuggled solo helpers / boosters from modified clients.
  assertNoDuelBoosters(answers);

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
    // Shadow Bot takeover: AFK human must not act again.
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
    if (!round) return { ok: false, error: "not_found" };
    if (round.attackSubmittedAt) {
      return { ok: false, error: "already_submitted" };
    }
    if (!round.questionIds || !Array.isArray(round.questionIds)) {
      return { ok: false, error: "questions_not_locked" };
    }

    const questionIds = round.questionIds as string[];
    const log = await gradeDuelAnswers(questionIds, answers);
    const attackCorrect = countCorrect(log);
    const now = new Date();
    const config = await getGameConfig();
    const nextStatus = statusAfterAttackSubmit(turn.roundNumber);

    // Score: attacker adds to their total.
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

    // Hydrate draft option labels for the snapshot (optional).
    const cats = await listDuelEligibleCategories();
    const draftIds = Array.isArray(round.draftOptionIds)
      ? (round.draftOptionIds as string[])
      : [];
    const draftOptions = cats.filter((c) => draftIds.includes(c.id));

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
      console.error("creditDuelTurnMissions after attack", err);
    }

    return {
      ok: true,
      duel: toDuelSnapshot(updated, user.id, draftOptions),
      missions,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (
      msg === "incomplete_answers" ||
      msg === "invalid_question" ||
      msg === "no_questions" ||
      msg === "missing_questions"
    ) {
      return { ok: false, error: "incomplete_answers" };
    }
    console.error("submitDuelAttack failed", err);
    return { ok: false, error: "server_error" };
  }
}
