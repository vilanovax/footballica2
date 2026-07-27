import "server-only";

import type { QuestionDifficulty } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion } from "@/lib/quiz/types";
import {
  survivalTierFallbackOrder,
  survivalTierForProgress,
  type SurvivalDifficultyTier,
} from "@/lib/game/survival";
import type { Locale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/getRequestLocale";

function pickFromPool<T extends { eloRating: number }>(
  pool: T[],
  tier: SurvivalDifficultyTier,
): T | null {
  if (pool.length === 0) return null;
  if (tier === "HARD") {
    // Prefer questions players miss most (lowest elo first), with light shuffle
    // among the hardest third so runs aren't identical.
    const sorted = [...pool].sort((a, b) => a.eloRating - b.eloRating);
    const cut = Math.max(1, Math.ceil(sorted.length / 3));
    const hardSlice = sorted.slice(0, cut);
    return hardSlice[Math.floor(Math.random() * hardSlice.length)] ?? null;
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export type CategoryOption = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  icon: string | null;
  questionCount: number;
};

export type ListEligibleCategoriesOptions = {
  /**
   * `false` (default) — public banks only (Survival / Duel).
   * `true` — only challenge-exclusive banks.
   * `"all"` — both.
   */
  challengeOnly?: boolean | "all";
  /** Player UI locale. Defaults to request cookie locale. */
  locale?: Locale;
};

/**
 * Active categories that currently hold at least `minQuestions` PUBLISHED rows.
 * Shared by Duel draft eligibility and Survival category picker.
 * Challenge-only banks are excluded by default; locale-scoped banks are filtered.
 */
export async function listEligibleCategories(
  minQuestions: number,
  options: ListEligibleCategoriesOptions = {},
): Promise<CategoryOption[]> {
  const need = Math.max(1, minQuestions);
  const challengeOnly = options.challengeOnly ?? false;
  const locale = options.locale ?? (await getRequestLocale());
  const cats = await prisma.category.findMany({
    where: {
      isActive: true,
      locales: { has: locale },
      ...(challengeOnly === "all"
        ? {}
        : { challengeOnly: challengeOnly === true }),
    },
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
 * Solo Survival uses progressive difficulty (EASY → MEDIUM → HARD) with fallback.
 */
export async function getCategoryQuestions(
  categoryId: string,
  limit: number,
  excludeIds: string[] = [],
): Promise<QuizQuestion[]> {
  return getCategoryQuestionsProgressive(categoryId, limit, excludeIds);
}

/**
 * Progressive Survival draw: each next question respects
 * {@link survivalTierForProgress}(seenCount). If a tier is empty, fall back.
 */
export async function getCategoryQuestionsProgressive(
  categoryId: string,
  limit: number,
  excludeIds: string[] = [],
): Promise<QuizQuestion[]> {
  const take = Math.max(1, limit);
  const exclude = new Set(excludeIds.filter(Boolean));
  let progress = exclude.size;

  const rows = await prisma.question.findMany({
    where: {
      categoryId,
      status: "PUBLISHED",
      ...(exclude.size > 0 ? { id: { notIn: [...exclude] } } : {}),
    },
  });

  const pools: Record<QuestionDifficulty, typeof rows> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };
  for (const row of rows) {
    pools[row.difficulty].push(row);
  }

  const picked: typeof rows = [];
  const used = new Set<string>(exclude);

  while (picked.length < take) {
    const preferred = survivalTierForProgress(progress);
    const order = survivalTierFallbackOrder(preferred);
    let next: (typeof rows)[number] | null = null;

    for (const tier of order) {
      const pool = pools[tier].filter((q) => !used.has(q.id));
      next = pickFromPool(pool, tier);
      if (next) break;
    }

    if (!next) break;
    picked.push(next);
    used.add(next.id);
    progress += 1;
  }

  return picked.map(dbQuestionToQuiz);
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
