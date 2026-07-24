import "server-only";

import { prisma } from "@/lib/prisma";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion } from "@/lib/quiz/types";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type CategoryOption = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  icon: string | null;
  questionCount: number;
};

/**
 * Active categories that currently hold at least `minQuestions` PUBLISHED rows.
 * Shared by Duel draft eligibility and Survival category picker.
 */
export async function listEligibleCategories(
  minQuestions: number,
): Promise<CategoryOption[]> {
  const need = Math.max(1, minQuestions);
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

/**
 * Draw up to `limit` PUBLISHED questions from a category, excluding already-seen ids.
 * Solo Survival uses this for batched endless play (Victory Cap when empty).
 */
export async function getCategoryQuestions(
  categoryId: string,
  limit: number,
  excludeIds: string[] = [],
): Promise<QuizQuestion[]> {
  const take = Math.max(1, limit);
  const exclude = new Set(excludeIds.filter(Boolean));

  const rows = await prisma.question.findMany({
    where: {
      categoryId,
      status: "PUBLISHED",
      ...(exclude.size > 0 ? { id: { notIn: [...exclude] } } : {}),
    },
  });

  return shuffle(rows).slice(0, take).map(dbQuestionToQuiz);
}

/** Remaining PUBLISHED questions in a category after excluding `excludeIds`. */
export async function countCategoryQuestionsRemaining(
  categoryId: string,
  excludeIds: string[] = [],
): Promise<number> {
  const exclude = excludeIds.filter(Boolean);
  return prisma.question.count({
    where: {
      categoryId,
      status: "PUBLISHED",
      ...(exclude.length > 0 ? { id: { notIn: exclude } } : {}),
    },
  });
}
