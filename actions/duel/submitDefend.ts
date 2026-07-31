"use server";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { requireUserClub } from "@/lib/player/current";
import {
  canUserAct,
  countCorrect,
  describeTurn,
  resolveDuelWinner,
  tallyRoundWins,
  statusAfterDefendSubmit,
  statusWhenStartingDefend,
} from "@/lib/duel";
import { gradeDuelAnswers } from "@/lib/duel/grade";
import { assertNoDuelBoosters } from "@/lib/duel/fairPlay";
import type { DuelAnswerSubmission } from "@/lib/duel/types";
import { quizRoundCreateData } from "@/lib/duel/createQuizRound";
import {
  listDuelEligibleCategories,
  usedCategoryIdsFromRounds,
} from "@/lib/duel/draw";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion } from "@/lib/quiz/types";
import {
  creditDuelMissions,
  creditDuelTurnMissions,
} from "@/lib/game/missionEngine";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

export type BeginDefendResult =
  | { ok: true; questions: QuizQuestion[]; duel: DuelSnapshot }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "server_error";
    };

export type SubmitDefendResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      /** Present when this submit finished the duel. */
      missions?: EvaluateMissionsResult;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "incomplete_answers"
        | "already_submitted"
        | "server_error";
    };

async function loadQuestionsByIds(ids: string[]): Promise<QuizQuestion[]> {
  const rows = await prisma.question.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((r) => dbQuestionToQuiz(r!));
}

/**
 * Open a defend turn: WAITING_* → *_DEFENDING and return the attacker's questions.
 */
export async function beginDuelDefend(
  duelId: string,
): Promise<BeginDefendResult> {
  void tickDuelJobs();

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const duel = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: duelSnapshotInclude,
    });
    if (!duel) return { ok: false, error: "not_found" };
    if (duel.timeoutUserId === user.id) {
      return { ok: false, error: "not_your_turn" };
    }

    let status = duel.status;
    const startDefend = statusWhenStartingDefend(status);
    if (startDefend) {
      // Only the waiting player may claim the defend turn.
      const expected =
        status === "WAITING_B" ? duel.opponentId : duel.challengerId;
      if (user.id !== expected) return { ok: false, error: "not_your_turn" };

      const updated = await prisma.duelMatch.update({
        where: { id: duel.id },
        data: { status: startDefend, turnUserId: user.id },
        include: duelSnapshotInclude,
      });
      status = updated.status;
      Object.assign(duel, updated);
    }

    if (
      !canUserAct({
        status,
        userId: user.id,
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
      })
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const turn = describeTurn(status);
    if (turn.kind !== "defend" || turn.roundNumber == null) {
      return { ok: false, error: "not_your_turn" };
    }

    const round = duel.rounds.find((r) => r.roundNumber === turn.roundNumber);
    if (!round?.questionIds || !Array.isArray(round.questionIds)) {
      return { ok: false, error: "not_found" };
    }

    const questions = await loadQuestionsByIds(round.questionIds as string[]);
    return {
      ok: true,
      questions,
      duel: toDuelSnapshot(duel, user.id),
    };
  } catch (err) {
    console.error("beginDuelDefend failed", err);
    return { ok: false, error: "server_error" };
  }
}

/**
 * Submit defense answers. Round 1 → create round 2 for opponent attack.
 * Round 2 → COMPLETED + weekly XP for the winner.
 */
export async function submitDuelDefend(
  duelId: string,
  answers: DuelAnswerSubmission[],
): Promise<SubmitDefendResult> {
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
    if (!round) return { ok: false, error: "not_found" };
    if (round.defenseSubmittedAt) {
      return { ok: false, error: "already_submitted" };
    }
    if (!round.questionIds || !Array.isArray(round.questionIds)) {
      return { ok: false, error: "not_found" };
    }

    const log = await gradeDuelAnswers(round.questionIds as string[], answers);
    const defenseCorrect = countCorrect(log);
    const now = new Date();
    const config = await getGameConfig();
    const nextStatus = statusAfterDefendSubmit(turn.roundNumber);

    // Defender scores onto their total.
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
        },
      });

      if (nextStatus === "B_ATTACKING" && duel.opponentId) {
        // Round 2 starts as QUIZ draft; attacker may lock Memory if unused.
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

      // Round 2 defense finished → COMPLETED.
      // Match score = round wins; aggregate goals only break ties.
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
      console.error("creditDuelTurnMissions after defend", err);
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
        console.error("creditDuelMissions after defend", err);
      }
    }

    return { ok: true, duel: snapshot, missions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "incomplete_answers" || msg === "invalid_question") {
      return { ok: false, error: "incomplete_answers" };
    }
    console.error("submitDuelDefend failed", err);
    return { ok: false, error: "server_error" };
  }
}
