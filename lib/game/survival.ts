/**
 * Survival Mode (3-lives / category endless) — pure config + reward math.
 * Keep framework-free so client preview and server settle never disagree.
 * Soft economy numbers live in `GameConfig.survival` (Live-Ops tunable).
 */

import {
  DEFAULT_GAME_CONFIG,
  type GameConfig,
} from "@/lib/game/economy";

/** Hearts at kickoff (default). Prefer `config.survival.lives` on server. */
export const SURVIVAL_LIVES = DEFAULT_GAME_CONFIG.survival.lives;

/** Questions fetched per drawSurvivalBatch hop. */
export const SURVIVAL_BATCH_SIZE = 10;

/** Prefetch the next batch when the local queue drops to this many. */
export const SURVIVAL_PREFETCH_BELOW = 3;

/** Fuse per Survival question (ms) — between Penalty and Quick pace. */
export const SURVIVAL_DURATION_MS = 8_000;

/** Minimum PUBLISHED questions required to offer a category on the picker. */
export const SURVIVAL_MIN_CATEGORY_QUESTIONS = 5;

/** Default stamina cost — prefer `config.survival.staminaCost` on settle. */
export const SURVIVAL_STAMINA_COST = DEFAULT_GAME_CONFIG.survival.staminaCost;

/** @deprecated Use GameConfig.survival — kept as default aliases for clients. */
export const SURVIVAL_COINS_PER_CORRECT =
  DEFAULT_GAME_CONFIG.survival.coinsPerCorrect;
export const SURVIVAL_XP_PER_CORRECT = DEFAULT_GAME_CONFIG.survival.xpPerCorrect;
export const SURVIVAL_FANS_PER_CORRECT =
  DEFAULT_GAME_CONFIG.survival.fansPerCorrect;
export const SURVIVAL_CLEARED_COIN_BONUS =
  DEFAULT_GAME_CONFIG.survival.clearedCoinBonus;
export const SURVIVAL_CLEARED_XP_BONUS =
  DEFAULT_GAME_CONFIG.survival.clearedXpBonus;

/**
 * Progressive difficulty by questions already seen this run
 * (≈ score progression for a clean run):
 *   0–5  → EASY warm-up
 *   6–15 → MEDIUM engagement
 *   16+  → HARD survival
 */
export const SURVIVAL_TIER1_MAX_SEEN = 5;
export const SURVIVAL_TIER2_MAX_SEEN = 15;

export type SurvivalDifficultyTier = "EASY" | "MEDIUM" | "HARD";

/** Difficulty bucket for the next question at `seenCount` progress. */
export function survivalTierForProgress(
  seenCount: number,
): SurvivalDifficultyTier {
  const n = Math.max(0, Math.floor(seenCount));
  if (n <= SURVIVAL_TIER1_MAX_SEEN) return "EASY";
  if (n <= SURVIVAL_TIER2_MAX_SEEN) return "MEDIUM";
  return "HARD";
}

/** Preferred tier then graceful fallbacks (harder → easier → any). */
export function survivalTierFallbackOrder(
  preferred: SurvivalDifficultyTier,
): SurvivalDifficultyTier[] {
  switch (preferred) {
    case "EASY":
      return ["EASY", "MEDIUM", "HARD"];
    case "MEDIUM":
      return ["MEDIUM", "HARD", "EASY"];
    case "HARD":
      return ["HARD", "MEDIUM", "EASY"];
  }
}

export type SurvivalEndReason = "eliminated" | "cleared";

export type SurvivalRewardBreakdown = {
  score: number;
  coins: number;
  xp: number;
  fans: number;
  bestCombo: number;
  endReason: SurvivalEndReason;
};

/**
 * Coins / XP / fans from verified corrects + optional clear-bank bonus.
 * Pure — pass the effective `GameConfig` from the caller (no I/O here).
 */
export function computeSurvivalRewards(
  input: {
    score: number;
    bestCombo: number;
    endReason: SurvivalEndReason;
  },
  config: GameConfig = DEFAULT_GAME_CONFIG,
): SurvivalRewardBreakdown {
  const s = config.survival;
  const score = Math.max(0, Math.floor(input.score));
  const clearedBonus =
    input.endReason === "cleared" ? s.clearedCoinBonus : 0;
  const clearedXp = input.endReason === "cleared" ? s.clearedXpBonus : 0;
  return {
    score,
    coins: score * s.coinsPerCorrect + clearedBonus,
    xp: score * s.xpPerCorrect + clearedXp,
    fans: score * s.fansPerCorrect,
    bestCombo: Math.max(0, Math.floor(input.bestCombo)),
    endReason: input.endReason,
  };
}

/** Weekly league XP from a Survival score (pure). */
export function survivalWeeklyXp(
  score: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const divisor = Math.max(1, config.survival.weeklyXpDivisor);
  return Math.max(1, Math.floor(Math.max(0, score) / divisor));
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
