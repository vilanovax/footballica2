import "server-only";

import type { Club } from "@/generated/prisma/client";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import type { BusinessSnapshot } from "@/lib/club/businessEconomy";
import { buildBusinessSnapshot } from "@/lib/club/businessEconomy";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { canClaimNews } from "@/lib/boosters/boosters";
import { DEFAULT_CLUB_COLOR_KEY } from "@/lib/onboarding/clubColors";

/**
 * Shared serializers kept here so older imports (`toClubSnapshot`,
 * `ProfileSnapshot`) stay stable. Session-aware reads live in
 * `lib/player/current.ts` — do not add dummy-user fallbacks here.
 */

const EMPTY_BUSINESS: BusinessSnapshot = buildBusinessSnapshot({
  clubFunds: 0,
  vaultBalance: 0,
  vaultLevel: 1,
  fans: 0,
  playerLevel: 1,
  facilities: [],
});

/** Serializable club shape shared with client components. */
export function toClubSnapshot(
  club: Club,
  activeNewsBooster: ClubSnapshot["activeNewsBooster"] = null,
  business: BusinessSnapshot = EMPTY_BUSINESS,
): ClubSnapshot {
  const regen = computeStaminaRegen(club);
  return {
    name: club.name,
    coins: club.coins,
    fans: club.fans,
    stamina: club.stamina,
    maxStamina: club.maxStamina,
    stadiumLevel: club.stadiumLevel,
    medicalLevel: club.medicalLevel,
    trainingGroundLevel: club.trainingGroundLevel,
    boosterFiftyFifty: club.boosterFiftyFifty,
    boosterFreezeTimer: club.boosterFreezeTimer,
    msUntilNext: regen.msUntilNext,
    avatar: club.avatar,
    colorKey: club.colorKey ?? DEFAULT_CLUB_COLOR_KEY,
    tutorialStep: club.tutorialStep,
    newsClaimable: canClaimNews(club.lastNewsClaim, new Date()),
    activeNewsBooster,
    mysteryStreak: club.mysteryStreak,
    longestMysteryStreak: club.longestMysteryStreak,
    business,
  };
}

/** Serializable player-profile shape (club + user + unlocked badges). */
export type ProfileSnapshot = {
  managerName: string;
  clubName: string;
  stadiumName: string | null;
  avatar: string | null;
  flag: string | null;
  colorKey: string;
  xp: number;
  matchesPlayed: number;
  matchesWon: number;
  goalsTotal: number;
  highestCombo: number;
  dailyStreak: number;
  longestDailyStreak: number;
  mysteryStreak: number;
  longestMysteryStreak: number;
  mysterySolves: number;
  gridStreak: number;
  longestGridStreak: number;
  gridSolves: number;
  badges: { slug: string; unlockedAt: string }[];
};
