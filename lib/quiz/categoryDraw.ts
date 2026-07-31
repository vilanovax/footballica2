import "server-only";

import type { Question, QuestionDifficulty } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FORMAT_BIAS_EVERY_N,
  formatBiasQuota,
  isLiveOpsFormatType,
  shouldPreferFormatPick,
  type FormatBiasOptions,
  resolvePreferredFormatTypes,
} from "@/lib/quiz/formatBias";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion } from "@/lib/quiz/types";
import {
  survivalTierFallbackOrder,
  survivalTierForProgress,
  type SurvivalDifficultyTier,
} from "@/lib/game/survival";
import type { Locale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/getRequestLocale";
import { publishedInCategoryWhere } from "@/lib/quiz/inCategory";

function pickFromPool<T extends { eloRating: number }>(
  pool: T[],
  tier: SurvivalDifficultyTier,
): T | null {
  if (pool.length === 0) return null;
  if (tier === "HARD") {
    const sorted = [...pool].sort((a, b) => a.eloRating - b.eloRating);
    const cut = Math.max(1, Math.ceil(sorted.length / 3));
    const hardSlice = sorted.slice(0, cut);
    return hardSlice[Math.floor(Math.random() * hardSlice.length)] ?? null;
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function pickTiered(
  pools: Record<QuestionDifficulty, Question[]>,
  preferred: SurvivalDifficultyTier,
  used: Set<string>,
  formatOnly: boolean,
  bias: FormatBiasOptions,
): Question | null {
  const preferredTypes = resolvePreferredFormatTypes(bias.preferredTypes);
  const order = survivalTierFallbackOrder(preferred);
  for (const tier of order) {
    const pool = pools[tier].filter(
      (q) =>
        !used.has(q.id) &&
        (!formatOnly || isLiveOpsFormatType(q.type, preferredTypes)),
    );
    const next = pickFromPool(pool, tier);
    if (next) return next;
  }
  return null;
}

/**
 * Ensure the batch meets Live-Ops format quota by swapping TEXT picks for
 * unused format rows when available (same progressive bank).
 */
function ensureFormatQuota(
  picked: Question[],
  pools: Record<QuestionDifficulty, Question[]>,
  used: Set<string>,
  bias: FormatBiasOptions,
): Question[] {
  const everyN = bias.everyN ?? FORMAT_BIAS_EVERY_N;
  const preferredTypes = resolvePreferredFormatTypes(bias.preferredTypes);
  const quota = Math.min(
    formatBiasQuota(picked.length, everyN),
    [...pools.EASY, ...pools.MEDIUM, ...pools.HARD].filter((q) =>
      isLiveOpsFormatType(q.type, preferredTypes),
    ).length,
  );
  if (quota <= 0) return picked;

  const out = [...picked];
  let formatCount = out.filter((q) =>
    isLiveOpsFormatType(q.type, preferredTypes),
  ).length;

  while (formatCount < quota) {
    const format = pickTiered(
      pools,
      survivalTierForProgress(out.length),
      used,
      true,
      bias,
    );
    if (!format) break;

    let swapAt = -1;
    for (let i = out.length - 1; i >= 0; i--) {
      if (!isLiveOpsFormatType(out[i]!.type, preferredTypes)) {
        swapAt = i;
        break;
      }
    }
    if (swapAt < 0) break;

    const removed = out[swapAt]!;
    used.delete(removed.id);
    out[swapAt] = format;
    used.add(format.id);
    formatCount += 1;
  }

  return out;
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
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameFa: true,
      icon: true,
    },
  });

  // Count primary + M2N memberships (distinct questions) per category.
  const counted = await Promise.all(
    cats.map(async (c) => ({
      ...c,
      questionCount: await prisma.question.count({
        where: publishedInCategoryWhere(c.id),
      }),
    })),
  );

  return counted
    .filter((c) => c.questionCount >= need)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nameEn: c.nameEn,
      nameFa: c.nameFa,
      icon: c.icon,
      questionCount: c.questionCount,
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
  bias: FormatBiasOptions = {},
): Promise<QuizQuestion[]> {
  return getCategoryQuestionsProgressive(categoryId, limit, excludeIds, bias);
}

/**
 * Progressive Survival draw: each next question respects
 * {@link survivalTierForProgress}(seenCount). If a tier is empty, fall back.
 */
export async function getCategoryQuestionsProgressive(
  categoryId: string,
  limit: number,
  excludeIds: string[] = [],
  bias: FormatBiasOptions = {},
): Promise<QuizQuestion[]> {
  const take = Math.max(1, limit);
  const exclude = new Set(excludeIds.filter(Boolean));
  let progress = exclude.size;
  const everyN = bias.everyN ?? FORMAT_BIAS_EVERY_N;

  const rows = await prisma.question.findMany({
    where: publishedInCategoryWhere(categoryId, [...exclude]),
  });

  const pools: Record<QuestionDifficulty, typeof rows> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };
  for (const row of rows) {
    pools[row.difficulty].push(row);
  }

  const picked: Question[] = [];
  const used = new Set<string>(exclude);

  while (picked.length < take) {
    const preferred = survivalTierForProgress(progress);
    let next: Question | null = null;

    if (shouldPreferFormatPick(Math.random, everyN)) {
      next = pickTiered(pools, preferred, used, true, bias);
    }
    if (!next) {
      next = pickTiered(pools, preferred, used, false, bias);
    }

    if (!next) break;
    picked.push(next);
    used.add(next.id);
    progress += 1;
  }

  const biased = ensureFormatQuota(picked, pools, used, bias);
  return biased.map(dbQuestionToQuiz);
}

/** Remaining PUBLISHED questions in a category after excluding `excludeIds`. */
export async function countCategoryQuestionsRemaining(
  categoryId: string,
  excludeIds: string[] = [],
): Promise<number> {
  return prisma.question.count({
    where: publishedInCategoryWhere(categoryId, excludeIds),
  });
}
