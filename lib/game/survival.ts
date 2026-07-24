/**
 * Survival Mode (3-lives / category endless) — pure config + reward math.
 * Keep framework-free so client preview and server settle never disagree.
 */

/** Hearts at kickoff. */
export const SURVIVAL_LIVES = 3;

/** Questions fetched per drawSurvivalBatch hop. */
export const SURVIVAL_BATCH_SIZE = 10;

/** Prefetch the next batch when the local queue drops to this many. */
export const SURVIVAL_PREFETCH_BELOW = 3;

/** Fuse per Survival question (ms) — between Penalty and Quick pace. */
export const SURVIVAL_DURATION_MS = 8_000;

/** Minimum PUBLISHED questions required to offer a category on the picker. */
export const SURVIVAL_MIN_CATEGORY_QUESTIONS = 5;

/** Stamina spent to open a Survival run. */
export const SURVIVAL_STAMINA_COST = 1;

export type SurvivalEndReason = "eliminated" | "cleared";

export type SurvivalRewardBreakdown = {
  score: number;
  coins: number;
  xp: number;
  fans: number;
  bestCombo: number;
  endReason: SurvivalEndReason;
};

/** Coins / XP / fans scale linearly with verified correct answers. */
export function computeSurvivalRewards(input: {
  score: number;
  bestCombo: number;
  endReason: SurvivalEndReason;
}): SurvivalRewardBreakdown {
  const score = Math.max(0, Math.floor(input.score));
  const clearedBonus = input.endReason === "cleared" ? 25 : 0;
  return {
    score,
    coins: score * 5 + clearedBonus,
    xp: score * 10 + (input.endReason === "cleared" ? 50 : 0),
    fans: score * 2,
    bestCombo: Math.max(0, Math.floor(input.bestCombo)),
    endReason: input.endReason,
  };
}

/** Longest consecutive correct streak from a boolean correctness sequence. */
export function bestComboFromResults(correctFlags: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const ok of correctFlags) {
    if (ok) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}
