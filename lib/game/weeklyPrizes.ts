/**
 * Weekly league prize tiers — single source of truth for UI + reset payouts.
 * Paid in `ensureWeeklyLeagueReset` (coins → Club, XP → User).
 * Framework-free so Hub/Leaderboard client components can import safely.
 */

export type WeeklyPrizeTier = {
  /** 1 = champion, 2 = silver, 3 = bronze */
  place: 1 | 2 | 3;
  coins: number;
  xp: number;
};

/** Soft rewards previewed on the leaderboard prize banner / sheet. */
export const WEEKLY_PRIZE_TIERS: readonly WeeklyPrizeTier[] = [
  { place: 1, coins: 1000, xp: 200 },
  { place: 2, coins: 500, xp: 100 },
  { place: 3, coins: 250, xp: 50 },
] as const;

export function weeklyChampionCoins(): number {
  return WEEKLY_PRIZE_TIERS[0]!.coins;
}
