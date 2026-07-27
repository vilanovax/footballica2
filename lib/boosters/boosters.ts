// Pure Newspaper-Event / booster logic. Shared by the server actions and UI so
// multipliers and copy stay consistent (single source of truth).

import type { RewardBreakdown } from "@/lib/game/economy";
import { tehranDayKeyClient } from "@/lib/game/tehranClock";

/** Mirrors the Prisma `BoosterType` enum. */
export type BoosterType = "COIN_BOOST" | "FAN_BOOST";

/** How long a claimed booster stays active (PRD: short, punchy windows). */
export const BOOSTER_DURATION_HOURS = 2;

/**
 * Daily claim gate — once per Asia/Tehran calendar day (aligned with missions).
 * A new Tehran day re-opens the mailbox even if a booster is still running.
 */
export function canClaimNews(lastNewsClaim: Date | null, now: Date): boolean {
  if (!lastNewsClaim) return true;
  return tehranDayKeyClient(lastNewsClaim) !== tehranDayKeyClient(now);
}

/** Look up catalog metadata for a stored headline id. */
export function newspaperEventById(id: string): NewspaperEvent | undefined {
  return NEWSPAPER_EVENTS.find((e) => e.id === id);
}

/** A booster instance as far as reward math cares. */
export type BoosterLike = {
  type: BoosterType;
  multiplier: number;
};

/**
 * A newspaper headline that grants a booster when claimed. `id` is the stable
 * translation key (stored in the DB `headline` column) so the UI can render the
 * headline in any locale — see `news.events.*` in the dictionaries.
 */
export type NewspaperEvent = {
  id: string;
  type: BoosterType;
  multiplier: number;
  emoji: string;
};

export const NEWSPAPER_EVENTS: NewspaperEvent[] = [
  { id: "LEGEND_VISIT", type: "COIN_BOOST", multiplier: 2, emoji: "🐐" },
  { id: "MYSTERY_SPONSOR", type: "COIN_BOOST", multiplier: 3, emoji: "💰" },
  { id: "STREET_PARADE", type: "FAN_BOOST", multiplier: 2, emoji: "📣" },
  { id: "TV_VIRAL", type: "FAN_BOOST", multiplier: 2.5, emoji: "📺" },
];

/** Random headline for a fresh claim. */
export function pickRandomEvent(): NewspaperEvent {
  const index = Math.floor(Math.random() * NEWSPAPER_EVENTS.length);
  return NEWSPAPER_EVENTS[index];
}

/** Formats a multiplier as "2" or "2.5" for display. */
export function formatMultiplier(multiplier: number): string {
  return Number.isInteger(multiplier) ? `${multiplier}` : multiplier.toFixed(1);
}

/** Stacked coin/fan multipliers from active Newspaper boosters. */
export function boosterMultipliers(boosters: BoosterLike[]): {
  coinMultiplier: number;
  fanMultiplier: number;
} {
  let coinMultiplier = 1;
  let fanMultiplier = 1;
  for (const booster of boosters) {
    if (booster.type === "COIN_BOOST") coinMultiplier *= booster.multiplier;
    if (booster.type === "FAN_BOOST") fanMultiplier *= booster.multiplier;
  }
  return { coinMultiplier, fanMultiplier };
}

/**
 * Apply active boosters to any { coins, fans } reward bag.
 * Same-type multipliers stack multiplicatively. Pure.
 */
export function applyBoosterMultipliers<T extends { coins: number; fans: number }>(
  rewards: T,
  boosters: BoosterLike[],
): T {
  const { coinMultiplier, fanMultiplier } = boosterMultipliers(boosters);
  return {
    ...rewards,
    coins: Math.round(rewards.coins * coinMultiplier),
    fans: Math.round(rewards.fans * fanMultiplier),
  };
}

/**
 * Apply active boosters to Match `RewardBreakdown`.
 * Pure — the server calls this before persisting.
 */
export function applyBoosters(
  rewards: RewardBreakdown,
  boosters: BoosterLike[],
): RewardBreakdown {
  return applyBoosterMultipliers(rewards, boosters);
}
