import "server-only";

import type { Club } from "@/generated/prisma/client";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { canClaimNews } from "@/lib/boosters/boosters";
import { DEFAULT_CLUB_COLOR_KEY } from "@/lib/onboarding/clubColors";

/**
 * Shared serializers kept here so older imports (`toClubSnapshot`,
 * `ProfileSnapshot`) stay stable. Session-aware reads live in
 * `lib/player/current.ts` — do not add dummy-user fallbacks here.
 */

/** Serializable club shape shared with client components. */
export function toClubSnapshot(club: Club): ClubSnapshot {
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
  badges: { slug: string; unlockedAt: string }[];
};
