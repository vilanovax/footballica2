// Pure Newspaper-Event / booster logic. Shared by the server actions and UI so
// multipliers and copy stay consistent (single source of truth).

import type { RewardBreakdown } from "@/lib/game/economy";

/** Mirrors the Prisma `BoosterType` enum. */
export type BoosterType = "COIN_BOOST" | "FAN_BOOST";

/** How long a claimed booster stays active (PRD: short, punchy windows). */
export const BOOSTER_DURATION_HOURS = 2;

/**
 * Daily claim gate. The Newspaper can be claimed once per calendar day; a new
 * day (server-local) re-opens it regardless of whether the booster still runs.
 */
export function canClaimNews(lastNewsClaim: Date | null, now: Date): boolean {
  if (!lastNewsClaim) return true;
  return lastNewsClaim.toDateString() !== now.toDateString();
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

/**
 * Apply active boosters to computed rewards. Multipliers of the same target
 * stack multiplicatively. Pure — the server calls this before persisting.
 */
export function applyBoosters(
  rewards: RewardBreakdown,
  boosters: BoosterLike[],
): RewardBreakdown {
  let coinMultiplier = 1;
  let fanMultiplier = 1;

  for (const booster of boosters) {
    if (booster.type === "COIN_BOOST") coinMultiplier *= booster.multiplier;
    if (booster.type === "FAN_BOOST") fanMultiplier *= booster.multiplier;
  }

  return {
    ...rewards,
    coins: Math.round(rewards.coins * coinMultiplier),
    fans: Math.round(rewards.fans * fanMultiplier),
  };
}
