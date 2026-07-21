// Pure "Next Milestone" logic for the post-match reward screen. Given the
// player's current budget (coins) and upgrade levels, it finds the single most
// motivating next goal — the upgrade they are CLOSEST to affording — so the UI
// can nudge with "just one more win…" psychology. Framework-free & client-safe.

import {
  UPGRADE_LIST,
  getUpgradeCost,
  type UpgradeKey,
} from "./upgrades";

export type MilestoneInput = {
  coins: number;
  stadiumLevel: number;
  medicalLevel: number;
  trainingGroundLevel: number;
};

export type NextMilestone = {
  key: UpgradeKey;
  /** English name. */
  name: string;
  /** Persian name. */
  faName: string;
  icon: string;
  /** Coin cost of that upgrade's next level. */
  cost: number;
  /** Coins still needed (0 when already affordable). */
  remaining: number;
  /** True when the player can buy it right now. */
  affordable: boolean;
};

function levelFor(input: MilestoneInput, key: UpgradeKey): number {
  switch (key) {
    case "STADIUM":
      return input.stadiumLevel;
    case "MEDICAL":
      return input.medicalLevel;
    case "TRAINING_GROUND":
      return input.trainingGroundLevel;
  }
}

/**
 * Pick the next upgrade to chase: among all not-yet-maxed tracks, the one with
 * the smallest coin gap (tie-break: cheaper). Returns null only when everything
 * is maxed out.
 */
export function nextMilestone(input: MilestoneInput): NextMilestone | null {
  let best: NextMilestone | null = null;

  for (const def of UPGRADE_LIST) {
    const cost = getUpgradeCost(def.key, levelFor(input, def.key));
    if (cost == null) continue; // maxed track

    const remaining = Math.max(0, cost - input.coins);
    const candidate: NextMilestone = {
      key: def.key,
      name: def.name,
      faName: def.faName,
      icon: def.icon,
      cost,
      remaining,
      affordable: remaining === 0,
    };

    if (
      !best ||
      remaining < best.remaining ||
      (remaining === best.remaining && cost < best.cost)
    ) {
      best = candidate;
    }
  }

  return best;
}

/** How many typical wins (at `coinsPerWin`) cover the remaining gap. */
export function winsAway(remaining: number, coinsPerWin: number): number {
  if (remaining <= 0) return 0;
  if (coinsPerWin <= 0) return Infinity;
  return Math.ceil(remaining / coinsPerWin);
}
