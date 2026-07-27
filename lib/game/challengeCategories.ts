import "server-only";

import { prisma } from "@/lib/prisma";
import {
  listEligibleCategories,
  type CategoryOption,
} from "@/lib/quiz/categoryDraw";
import { SURVIVAL_MIN_CATEGORY_QUESTIONS } from "@/lib/game/survival";
import type { Locale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/getRequestLocale";

/**
 * Resolve which Survival banks a challenge may use for the player's locale.
 * - Linked categories → those banks (including challengeOnly) that include locale
 * - No links → any public (non-challengeOnly) eligible bank for locale
 */
export async function listChallengeSurvivalCategories(
  challengeId: string,
  minQuestions: number = SURVIVAL_MIN_CATEGORY_QUESTIONS,
  locale?: Locale,
): Promise<CategoryOption[]> {
  const activeLocale = locale ?? (await getRequestLocale());
  const links = await prisma.recordChallengeCategory.findMany({
    where: { challengeId },
    select: { categoryId: true },
  });

  if (links.length === 0) {
    return listEligibleCategories(minQuestions, {
      challengeOnly: false,
      locale: activeLocale,
    });
  }

  const ids = links.map((l) => l.categoryId);
  const cats = await prisma.category.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      locales: { has: activeLocale },
    },
    include: {
      _count: {
        select: { questions: { where: { status: "PUBLISHED" } } },
      },
    },
  });

  const need = Math.max(1, minQuestions);
  return cats
    .filter((c) => c._count.questions >= need)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nameEn: c.nameEn,
      nameFa: c.nameFa,
      icon: c.icon,
      questionCount: c._count.questions,
    }))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

/** True when `categoryId` is allowed for this challenge (or classic Survival). */
export async function isCategoryAllowedForChallenge(input: {
  categoryId: string;
  challengeId: string | null;
  locale?: Locale;
}): Promise<boolean> {
  const activeLocale = input.locale ?? (await getRequestLocale());
  const category = await prisma.category.findFirst({
    where: {
      id: input.categoryId,
      isActive: true,
      locales: { has: activeLocale },
    },
    select: { id: true, challengeOnly: true },
  });
  if (!category) return false;

  if (!input.challengeId) {
    return !category.challengeOnly;
  }

  const links = await prisma.recordChallengeCategory.findMany({
    where: { challengeId: input.challengeId },
    select: { categoryId: true },
  });

  if (links.length === 0) {
    return !category.challengeOnly;
  }

  return links.some((l) => l.categoryId === category.id);
}
