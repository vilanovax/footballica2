"use server";

import {
  getCategoryQuestions,
  countCategoryQuestionsRemaining,
  listEligibleCategories,
} from "@/lib/quiz/categoryDraw";
import {
  SURVIVAL_BATCH_SIZE,
  SURVIVAL_MIN_CATEGORY_QUESTIONS,
} from "@/lib/game/survival";
import type { QuizQuestion } from "@/lib/quiz/types";
import { requireUserClub } from "@/lib/player/current";
import { prisma } from "@/lib/prisma";

export type SurvivalBatchResult =
  | {
      ok: true;
      questions: QuizQuestion[];
      /** PUBLISHED questions still left AFTER this batch (excluding prior seen + this batch). */
      remainingAfter: number;
      /** True when the category has no unseen questions left (Victory Cap trigger). */
      bankExhausted: boolean;
    }
  | { ok: false; error: string };

/**
 * Draw the next Survival batch for a category, skipping already-seen question ids.
 * Empty `questions` + `bankExhausted` means Victory Cap — client must end the run.
 */
export async function drawSurvivalBatch(input: {
  categoryId: string;
  seenQuestionIds: string[];
  limit?: number;
}): Promise<SurvivalBatchResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "not_authenticated" };
  } catch {
    return { ok: false, error: "not_authenticated" };
  }

  const categoryId = typeof input.categoryId === "string" ? input.categoryId : "";
  if (!categoryId) return { ok: false, error: "invalid_category" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) return { ok: false, error: "category_not_found" };

  const seen = Array.isArray(input.seenQuestionIds)
    ? input.seenQuestionIds.filter((id): id is string => typeof id === "string")
    : [];
  const limit = Math.max(
    1,
    Math.min(20, Math.floor(input.limit ?? SURVIVAL_BATCH_SIZE)),
  );

  const questions = await getCategoryQuestions(categoryId, limit, seen);
  const seenPlusBatch = [...seen, ...questions.map((q) => q.id)];
  const remainingAfter = await countCategoryQuestionsRemaining(
    categoryId,
    seenPlusBatch,
  );

  return {
    ok: true,
    questions,
    remainingAfter,
    bankExhausted: questions.length === 0,
  };
}

/** Categories eligible for Survival picker (enough PUBLISHED depth). */
export async function listSurvivalCategories() {
  const pair = await requireUserClub();
  if (!pair) {
    return { ok: false as const, error: "not_authenticated" };
  }

  const categories = await listEligibleCategories(
    SURVIVAL_MIN_CATEGORY_QUESTIONS,
  );
  return { ok: true as const, categories };
}
