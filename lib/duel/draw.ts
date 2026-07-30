import "server-only";

import { getGameConfig } from "@/lib/game/gameConfig";
import { resolveThemeBias } from "@/lib/game/liveOpsTheme";
import { FORMAT_BIAS_EVERY_N } from "@/lib/quiz/formatBias";
import type { DuelCategoryOption } from "@/lib/duel/types";
import {
  getCategoryQuestions,
  listEligibleCategories,
} from "@/lib/quiz/categoryDraw";
import type { QuizQuestion } from "@/lib/quiz/types";

export type { DuelCategoryOption };

/**
 * Active categories that have enough PUBLISHED questions for one attack.
 */
export async function listDuelEligibleCategories(
  minQuestions?: number,
): Promise<DuelCategoryOption[]> {
  const config = await getGameConfig();
  const need = minQuestions ?? config.duel.questionsPerAttack;
  return listEligibleCategories(need);
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
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, take);
}

/**
 * Draw `count` PUBLISHED questions from a category.
 * Respects global Live-Ops theme bias (LOGO_WEEK → IMAGE/REVEAL_IMAGE, etc.).
 */
export async function drawCategoryQuestions(
  categoryId: string,
  count?: number,
): Promise<QuizQuestion[]> {
  const config = await getGameConfig();
  const need = count ?? config.duel.questionsPerAttack;
  const bias = resolveThemeBias({
    themeKey: config.liveOps.themeKey,
    preferredTypes: config.liveOps.preferredTypes,
    formatBiasEveryN: config.liveOps.formatBiasEveryN,
    fallbackEveryN: FORMAT_BIAS_EVERY_N,
  });
  const questions = await getCategoryQuestions(
    categoryId,
    need,
    [],
    bias
      ? { preferredTypes: [...bias.preferredTypes], everyN: bias.everyN }
      : {},
  );
  if (questions.length < need) {
    throw new Error("not_enough_questions");
  }
  return questions;
}
