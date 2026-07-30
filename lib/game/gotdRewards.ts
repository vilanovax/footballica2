/**
 * Pure Game of the Day win reward math (Mystery + Grid).
 * No Prisma — shared by server actions and (later) admin previews.
 */

import type { GameConfig } from "@/lib/game/economy";

export type GotdKind = "mystery" | "grid";

/** Client + rewardJson payload for a GotD SOLVED settle. */
export type GotdRewardsPayload = {
  coinsEarned: number;
  xpEarned: number;
  streakBonus: number;
  perfectBonus: number;
  /** Extra breakdown for UI / audit (optional on wire, always in rewardJson). */
  baseCoins: number;
  baseXp: number;
  streakDays: number;
  streakMultiplierPerDay: number;
  perfect: boolean;
  kind: GotdKind;
};

/**
 * coinsEarned = baseCoins + (baseCoins * streakDays * mult) + perfectBonus
 * xpEarned = baseXp + floor(baseXp * streakDays * mult)
 */
export function calculateGotdWinRewards(input: {
  gotd: GameConfig["gotd"];
  kind: GotdKind;
  /** Streak after this win (Tehran consecutive days, ≥ 1). */
  streakDays: number;
  perfect: boolean;
}): GotdRewardsPayload {
  const { gotd, kind, perfect } = input;
  const streakDays = Math.max(1, Math.floor(input.streakDays));
  const mult = Math.max(0, gotd.streakMultiplierPerDay);

  const baseCoins =
    kind === "mystery" ? gotd.mysteryWinCoins : gotd.gridWinCoins;
  const baseXp = kind === "mystery" ? gotd.mysteryWinXp : gotd.gridWinXp;

  const streakBonus = Math.floor(baseCoins * streakDays * mult);
  const xpStreak = Math.floor(baseXp * streakDays * mult);
  const perfectBonus = perfect ? gotd.perfectClearBonusCoins : 0;

  return {
    kind,
    baseCoins,
    baseXp,
    streakDays,
    streakMultiplierPerDay: mult,
    streakBonus,
    perfectBonus,
    perfect,
    coinsEarned: baseCoins + streakBonus + perfectBonus,
    xpEarned: baseXp + xpStreak,
  };
}
