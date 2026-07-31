import "server-only";

import { getGameConfig } from "@/lib/game/gameConfig";
import { pickDraftCategories } from "@/lib/duel/draw";
import type { Prisma } from "@/generated/prisma/client";

export type QuizRoundShell = {
  roundNumber: number;
  roundType: "QUIZ";
  attackerId: string;
  draftOptionIds: Prisma.InputJsonValue;
};

/** QUIZ attack shell with fresh draft chips (excludes already-locked categories). */
export async function quizRoundCreateData(opts: {
  attackerId: string;
  roundNumber: number;
  excludeCategoryIds?: string[];
  draftChoices?: number;
}): Promise<QuizRoundShell> {
  const config = await getGameConfig();
  const draft = await pickDraftCategories(
    opts.draftChoices ?? config.duel.draftChoices,
    opts.excludeCategoryIds ?? [],
  );

  return {
    roundNumber: opts.roundNumber,
    roundType: "QUIZ",
    attackerId: opts.attackerId,
    draftOptionIds: draft.map((c) => c.id),
  };
}
