/**
 * Pure Game of the Day win reward math (Mystery + Grid + Star Path).
 * No Prisma — shared by server actions and (later) admin previews.
 */

import type { GameConfig } from "@/lib/game/economy";

export type GotdKind = "mystery" | "grid" | "starPath";

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
  /** Star Path only — puzzle score 100|75|50|25. */
  score?: number;
};

function lerp(min: number, max: number, t: number): number {
  return Math.round(min + (max - min) * Math.min(1, Math.max(0, t)));
}

/** Map Star Path score (25..100) onto min..max payout band. */
export function starPathBasePayout(
  gotd: GameConfig["gotd"],
  score: number,
): { coins: number; xp: number } {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  // 25 → 0, 100 → 1
  const t = s <= 25 ? 0 : (s - 25) / 75;
  return {
    coins: lerp(gotd.starPathWinCoinsMin, gotd.starPathWinCoinsMax, t),
    xp: lerp(gotd.starPathWinXpMin, gotd.starPathWinXpMax, t),
  };
}

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
  /** Required for kind === "starPath". */
  score?: number;
}): GotdRewardsPayload {
  const { gotd, kind, perfect } = input;
  const streakDays = Math.max(1, Math.floor(input.streakDays));
  const mult = Math.max(0, gotd.streakMultiplierPerDay);

  let baseCoins: number;
  let baseXp: number;
  if (kind === "mystery") {
    baseCoins = gotd.mysteryWinCoins;
    baseXp = gotd.mysteryWinXp;
  } else if (kind === "grid") {
    baseCoins = gotd.gridWinCoins;
    baseXp = gotd.gridWinXp;
  } else {
    const tier = starPathBasePayout(gotd, input.score ?? 25);
    baseCoins = tier.coins;
    baseXp = tier.xp;
  }

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
    ...(kind === "starPath" ? { score: input.score ?? 0 } : {}),
  };
}
