// Pure club-economy logic. Framework-free so both the server action and the UI
// can share the exact same cost/level rules (single source of truth).

import type { BoosterType } from "@/lib/boosters/boosters";

/** Live Newspaper Event still within its TTL (hub chip + match math). */
export type ActiveNewsBoosterSnapshot = {
  type: BoosterType;
  multiplier: number;
  /** Stable `news.events.*` key stored in ActiveBooster.headline. */
  headline: string;
  /** ISO expiry. */
  expiresAt: string;
};

export type ClubSnapshot = {
  /** Club display name (personalizes the Hub header). */
  name: string;
  coins: number;
  fans: number;
  stamina: number;
  maxStamina: number;
  stadiumLevel: number;
  medicalLevel: number;
  trainingGroundLevel: number;
  /** Consumable booster inventory (bought in the Shop). */
  boosterFiftyFifty: number;
  boosterFreezeTimer: number;
  /** Ms until the next +1 stamina (0 when full). Computed on read. */
  msUntilNext: number;
  /** Chosen manager avatar key (may be null on legacy rows). */
  avatar: string | null;
  /** Club brand palette key (see lib/onboarding/clubColors). */
  colorKey: string;
  /** FTUE progress: 0 tutorial match · 1 first upgrade · 2 done. */
  tutorialStep: number;
  /** True when today's Newspaper booster can still be claimed. */
  newsClaimable: boolean;
  /** Unexpired Newspaper Event, if any. */
  activeNewsBooster: ActiveNewsBoosterSnapshot | null;
};

export type UpgradeKey = "STADIUM" | "MEDICAL" | "TRAINING_GROUND";

type LevelField = "stadiumLevel" | "medicalLevel" | "trainingGroundLevel";

export type UpgradeDef = {
  key: UpgradeKey;
  field: LevelField;
  name: string;
  faName: string;
  icon: string;
  description: string;
  baseCost: number;
  growth: number;
  maxLevel: number;
};

export const UPGRADES: Record<UpgradeKey, UpgradeDef> = {
  STADIUM: {
    key: "STADIUM",
    field: "stadiumLevel",
    name: "Stadium",
    faName: "استادیوم",
    icon: "🏟️",
    description: "Bigger stands, more fans, better pitch.",
    baseCost: 100,
    growth: 1.8,
    maxLevel: 4,
  },
  MEDICAL: {
    key: "MEDICAL",
    field: "medicalLevel",
    name: "Medical Bay",
    faName: "بخش پزشکی",
    icon: "🏥",
    description: "Recover stamina faster between matches.",
    baseCost: 80,
    growth: 1.7,
    maxLevel: 4,
  },
  TRAINING_GROUND: {
    key: "TRAINING_GROUND",
    field: "trainingGroundLevel",
    name: "Training Ground",
    faName: "زمین تمرین",
    icon: "🏃",
    description: "Raises your daily stamina capacity.",
    baseCost: 120,
    growth: 1.9,
    maxLevel: 4,
  },
};

export const UPGRADE_LIST: UpgradeDef[] = [
  UPGRADES.STADIUM,
  UPGRADES.TRAINING_GROUND,
  UPGRADES.MEDICAL,
];

/** Current level of a given upgrade track. */
export function getClubLevel(club: ClubSnapshot, key: UpgradeKey): number {
  return club[UPGRADES[key].field];
}

export function isMaxLevel(key: UpgradeKey, currentLevel: number): boolean {
  return currentLevel >= UPGRADES[key].maxLevel;
}

/** Cost of the NEXT level, or null when already maxed. */
export function getUpgradeCost(
  key: UpgradeKey,
  currentLevel: number,
): number | null {
  const def = UPGRADES[key];
  if (currentLevel >= def.maxLevel) return null;
  return Math.round(def.baseCost * Math.pow(def.growth, currentLevel));
}
