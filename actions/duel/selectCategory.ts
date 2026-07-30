"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { canUserAct, describeTurn } from "@/lib/duel";
import { drawCategoryQuestions } from "@/lib/duel/draw";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion } from "@/lib/quiz/types";
import { tickDuelJobs } from "@/lib/duel/jobs";

export type SelectCategoryResult =
  | { ok: true; questions: QuizQuestion[]; roundNumber: number }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "invalid_category"
        | "already_locked"
        | "not_enough_questions"
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
 * Lock the attacker's chosen draft category and draw the attack questions.
 * Idempotent if questions are already locked for this round + category.
 */
export async function selectDuelCategory(
  duelId: string,
  categoryId: string,
): Promise<SelectCategoryResult> {
  void tickDuelJobs();

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const duel = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
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
    if (!round) return { ok: false, error: "not_found" };

    const draftIds = Array.isArray(round.draftOptionIds)
      ? (round.draftOptionIds as string[])
      : [];
    if (!draftIds.includes(categoryId)) {
      return { ok: false, error: "invalid_category" };
    }

    // Hard uniqueness: a category may be locked only once per duel.
    const alreadyUsed = duel.rounds.some(
      (r) => r.id !== round.id && r.categoryId === categoryId,
    );
    if (alreadyUsed) {
      return { ok: false, error: "invalid_category" };
    }

    if (round.questionIds && Array.isArray(round.questionIds) && round.categoryId) {
      if (round.categoryId !== categoryId) {
        return { ok: false, error: "already_locked" };
      }
      const questions = await loadQuestionsByIds(round.questionIds as string[]);
      return { ok: true, questions, roundNumber: round.roundNumber };
    }

    const questions = await drawCategoryQuestions(categoryId);
    await prisma.duelRound.update({
      where: { id: round.id },
      data: {
        categoryId,
        questionIds: questions.map((q) => q.id),
      },
    });

    return { ok: true, questions, roundNumber: round.roundNumber };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "not_enough_questions") {
      return { ok: false, error: "not_enough_questions" };
    }
    console.error("selectDuelCategory failed", err);
    return { ok: false, error: "server_error" };
  }
}
