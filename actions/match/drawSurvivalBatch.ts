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
import { isRecordChallengeLive } from "@/lib/game/recordChallenge";
import { isCategoryAllowedForChallenge } from "@/lib/game/challengeCategories";

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
 * Draw the next Survival batch with progressive difficulty (EASY→MEDIUM→HARD).
 * Optional `challengeId` requires ClubChallengeAccess (premium unlock).
 */
export async function drawSurvivalBatch(input: {
  categoryId: string;
  seenQuestionIds: string[];
  limit?: number;
  challengeId?: string | null;
}): Promise<SurvivalBatchResult> {
  let clubId: string;
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "not_authenticated" };
    clubId = pair.club.id;
  } catch {
    return { ok: false, error: "not_authenticated" };
  }

  const categoryId = typeof input.categoryId === "string" ? input.categoryId : "";
  if (!categoryId) return { ok: false, error: "invalid_category" };

  const challengeId =
    typeof input.challengeId === "string" && input.challengeId.trim()
      ? input.challengeId.trim()
      : null;

  if (challengeId) {
    const challenge = await prisma.recordChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge || !isRecordChallengeLive(challenge)) {
      return { ok: false, error: "challenge_not_live" };
    }
    const allowed = await isCategoryAllowedForChallenge({
      categoryId,
      challengeId,
    });
    if (!allowed) return { ok: false, error: "challenge_category_mismatch" };
    const access = await prisma.clubChallengeAccess.findUnique({
      where: {
        clubId_challengeId: { clubId, challengeId },
      },
    });
    if (!access) return { ok: false, error: "challenge_locked" };
  } else {
    const exclusive = await prisma.category.findFirst({
      where: { id: categoryId, isActive: true, challengeOnly: true },
      select: { id: true },
    });
    if (exclusive) return { ok: false, error: "category_not_found" };
  }

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

  // Progressive tiered draw (replaces pure random shuffle).
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
