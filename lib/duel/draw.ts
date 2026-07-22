import "server-only";

import { prisma } from "@/lib/prisma";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion } from "@/lib/quiz/types";
import { getGameConfig } from "@/lib/game/gameConfig";
import type { DuelCategoryOption } from "@/lib/duel/types";

export type { DuelCategoryOption };

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Active categories that have enough PUBLISHED questions for one attack.
 */
export async function listDuelEligibleCategories(
  minQuestions?: number,
): Promise<DuelCategoryOption[]> {
  const config = await getGameConfig();
  const need = minQuestions ?? config.duel.questionsPerAttack;

  const cats = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { questions: { where: { status: "PUBLISHED" } } },
      },
    },
  });

  return cats
    .filter((c) => c._count.questions >= need)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nameEn: c.nameEn,
      nameFa: c.nameFa,
      icon: c.icon,
      questionCount: c._count.questions,
    }));
}

/** Category ids already locked in this duel (must stay unique across rounds). */
export function usedCategoryIdsFromRounds(
  rounds: { categoryId: string | null }[],
): string[] {
  return rounds
    .map((r) => r.categoryId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/**
 * Pick up to N random eligible categories for the draft UI.
 * Never re-offers `excludeIds` — uniqueness within a duel is hard product rule.
 * If the unused bank is thinner than N, offers fewer chips rather than recycling.
 */
export async function pickDraftCategories(
  count?: number,
  excludeIds: string[] = [],
): Promise<DuelCategoryOption[]> {
  const config = await getGameConfig();
  const n = count ?? config.duel.draftChoices;
  const all = await listDuelEligibleCategories();
  const exclude = new Set(excludeIds);
  const pool = all.filter((c) => !exclude.has(c.id));
  if (pool.length === 0) {
    throw new Error("not_enough_categories");
  }
  const take = Math.min(n, pool.length);
  return shuffle(pool).slice(0, take);
}

/** Draw `count` PUBLISHED questions from a category (no semantic dedupe for duel v1). */
export async function drawCategoryQuestions(
  categoryId: string,
  count?: number,
): Promise<QuizQuestion[]> {
  const config = await getGameConfig();
  const need = count ?? config.duel.questionsPerAttack;

  const rows = await prisma.question.findMany({
    where: { categoryId, status: "PUBLISHED" },
  });
  if (rows.length < need) {
    throw new Error("not_enough_questions");
  }
  return shuffle(rows).slice(0, need).map(dbQuestionToQuiz);
}
