"use server";

import { getMatchQuestions } from "@/actions/getMatchQuestions";
import { getClubSnapshot } from "@/lib/player/current";
import type { QuizQuestion, QuestionDifficulty } from "@/lib/quiz/types";

export type MatchDraw = {
  /** The questions actually played. */
  questions: QuizQuestion[];
  /** Spare questions for the Substitution helper. */
  bench: QuizQuestion[];
  /** Live coin balance — the affordability ceiling for in-match helpers. */
  startingCoins: number;
};

/**
 * Draw a fresh match set + a small bench + the current coin balance in one hop.
 * Used by "Play Again" so replays get new questions AND an up-to-date budget
 * (the initial mount is seeded server-side from the page instead).
 */
export async function getMatchDraw(options: {
  count: number;
  bench?: number;
  difficulties?: QuestionDifficulty[];
}): Promise<MatchDraw> {
  const count = Math.max(1, options.count);
  const benchSize = Math.max(0, options.bench ?? 0);

  const drawn = await getMatchQuestions({
    count: count + benchSize,
    difficulties: options.difficulties,
  });

  const club = await getClubSnapshot();

  return {
    questions: drawn.slice(0, count),
    bench: drawn.slice(count),
    startingCoins: club?.coins ?? 0,
  };
}
