/**
 * Play Match Day economy previews — derived from GameConfig.
 * Framework-free so server page + client cards share the same numbers.
 */

import type { GameConfig } from "@/lib/game/economy";

/** Solo Penalty / Quick spend this much stamina (matches resolveMatch). */
export const SOLO_STAMINA_COST = 1;

export type PlayModeId = "penalty" | "quick" | "survival" | "duel";

export type PlayModeEconomy = {
  id: PlayModeId;
  staminaCost: number;
  /** Approximate coin payout for a typical win / solid run. */
  approxCoins: number;
  /** Approximate XP for a typical win / solid run. */
  approxXp: number;
  /** Question / kick count shown on the card (when fixed). */
  questionCount: number | null;
  /** Survival: coins per correct answer. */
  perCorrectCoins?: number;
  /** Survival: XP per correct answer. */
  perCorrectXp?: number;
  /** Survival lives. */
  lives?: number;
  /** Duel weekly XP on win. */
  duelWinWeeklyXp?: number;
  clearedCoinBonus?: number;
  clearedXpBonus?: number;
};

export function getPlayModeEconomy(config: GameConfig): Record<
  PlayModeId,
  PlayModeEconomy
> {
  const r = config.rewards;
  const s = config.survival;
  const penaltyQ = config.match.questionCount;
  const quickQ = config.match.quickQuestionCount;

  // Win path: coinsPerWin + modest goal coins; XP ≈ baseXp * questions + winBonus.
  const penaltyCoins = r.coinsPerWin + Math.round(penaltyQ * 0.5);
  const quickCoins = r.coinsPerWin + Math.round(quickQ * 0.4);
  const penaltyXp = r.baseXp * penaltyQ + r.winBonus;
  const quickXp = r.baseXp * quickQ + r.winBonus;

  return {
    penalty: {
      id: "penalty",
      staminaCost: SOLO_STAMINA_COST,
      approxCoins: penaltyCoins,
      approxXp: penaltyXp,
      questionCount: penaltyQ,
    },
    quick: {
      id: "quick",
      staminaCost: SOLO_STAMINA_COST,
      approxCoins: quickCoins,
      approxXp: quickXp,
      questionCount: quickQ,
    },
    survival: {
      id: "survival",
      staminaCost: s.staminaCost,
      approxCoins: s.coinsPerCorrect * 10,
      approxXp: s.xpPerCorrect * 10,
      questionCount: null,
      perCorrectCoins: s.coinsPerCorrect,
      perCorrectXp: s.xpPerCorrect,
      lives: s.lives,
      clearedCoinBonus: s.clearedCoinBonus,
      clearedXpBonus: s.clearedXpBonus,
    },
    duel: {
      id: "duel",
      staminaCost: config.duel.staminaCost,
      approxCoins: r.coinsPerWin,
      approxXp: r.baseXp * config.duel.questionsPerAttack,
      // R1 quiz shots + R2 memory pairs (pairs count as goals on the scoreboard).
      questionCount:
        config.duel.questionsPerAttack + config.duel.memoryPairs,
      duelWinWeeklyXp: config.duel.winWeeklyXp,
    },
  };
}
