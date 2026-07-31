import type { Prisma } from "@/generated/prisma/client";

/**
 * PUBLISHED questions whose primary `categoryId` OR an M2N `QuestionCategory`
 * membership matches `categoryId`. Shared by Draw, eligibility counts, and
 * remaining-bank checks.
 */
export function publishedInCategoryWhere(
  categoryId: string,
  excludeIds: string[] = [],
): Prisma.QuestionWhereInput {
  const exclude = excludeIds.filter(Boolean);
  return {
    status: "PUBLISHED",
    OR: [
      { categoryId },
      { categories: { some: { categoryId } } },
    ],
    ...(exclude.length > 0 ? { id: { notIn: exclude } } : {}),
  };
}

/** Same membership rule without forcing PUBLISHED (admin filters, etc.). */
export function inCategoryWhere(
  categoryId: string,
): Prisma.QuestionWhereInput {
  return {
    OR: [
      { categoryId },
      { categories: { some: { categoryId } } },
    ],
  };
}
