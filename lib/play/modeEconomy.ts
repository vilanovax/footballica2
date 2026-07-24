/**
 * Play Match Day economy previews — derived from GameConfig / Survival constants.
 * Framework-free so server page + client cards share the same numbers.
 */

import type { GameConfig } from "@/lib/game/economy";
import {
  SURVIVAL_CLEARED_COIN_BONUS,
  SURVIVAL_CLEARED_XP_BONUS,
  SURVIVAL_COINS_PER_CORRECT,
  SURVIVAL_LIVES,
  SURVIVAL_STAMINA_COST,
  SURVIVAL_XP_PER_CORRECT,
} from "@/lib/game/survival";

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
      staminaCost: SURVIVAL_STAMINA_COST,
      approxCoins: SURVIVAL_COINS_PER_CORRECT * 10,
      approxXp: SURVIVAL_XP_PER_CORRECT * 10,
      questionCount: null,
      perCorrectCoins: SURVIVAL_COINS_PER_CORRECT,
      perCorrectXp: SURVIVAL_XP_PER_CORRECT,
      lives: SURVIVAL_LIVES,
      clearedCoinBonus: SURVIVAL_CLEARED_COIN_BONUS,
      clearedXpBonus: SURVIVAL_CLEARED_XP_BONUS,
    },
    duel: {
      id: "duel",
      staminaCost: config.duel.staminaCost,
      approxCoins: r.coinsPerWin,
      approxXp: r.baseXp * config.duel.questionsPerAttack,
      questionCount: config.duel.questionsPerAttack * config.duel.rounds,
      duelWinWeeklyXp: config.duel.winWeeklyXp,
    },
  };
}
