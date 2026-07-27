import "server-only";

import { prisma } from "@/lib/prisma";
import type { Club, Prisma, PrismaClient, User } from "@/generated/prisma/client";
import type {
  ActiveNewsBoosterSnapshot,
  ClubSnapshot,
} from "@/lib/club/upgrades";
import type { BoosterType } from "@/lib/boosters/boosters";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { getSessionUserId } from "@/lib/auth/session";
import { toClubSnapshot, type ProfileSnapshot } from "@/lib/dev/dummyClub";

type Db = PrismaClient | Prisma.TransactionClient;

export type { ProfileSnapshot };

/** Unexpired Newspaper Event for hub chip + match math. */
export async function loadActiveNewsBooster(
  clubId: string,
  db: Db = prisma,
): Promise<ActiveNewsBoosterSnapshot | null> {
  const row = await db.activeBooster.findFirst({
    where: { clubId, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
    select: {
      type: true,
      multiplier: true,
      headline: true,
      expiresAt: true,
    },
  });
  if (!row) return null;
  return {
    type: row.type as BoosterType,
    multiplier: row.multiplier,
    headline: row.headline,
    expiresAt: row.expiresAt.toISOString(),
  };
}

/** ClubSnapshot including any live Newspaper Event. */
export async function toClubSnapshotWithBooster(
  club: Club,
  db: Db = prisma,
): Promise<ClubSnapshot> {
  const activeNewsBooster = await loadActiveNewsBooster(club.id, db);
  return toClubSnapshot(club, activeNewsBooster);
}

export type UserWithClub = User & { club: Club | null };

/** Current session user (no auto-create). Null when logged out. */
export async function getCurrentUser(
  db: Db = prisma,
): Promise<UserWithClub | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    include: { club: true },
  });
}

/** True when the session user has finished onboarding (has a club). */
export async function hasClub(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user?.club);
}

/**
 * Club snapshot for the session user with stamina regen applied.
 * Returns null when logged out or not yet onboarded.
 */
export async function getClubSnapshot(): Promise<ClubSnapshot | null> {
  const user = await getCurrentUser();
  if (!user?.club) return null;

  const regen = computeStaminaRegen(user.club);
  const club = regen.changed
    ? await prisma.club.update({
        where: { id: user.club.id },
        data: {
          stamina: regen.stamina,
          lastStaminaUpdate: regen.lastStaminaUpdate,
        },
      })
    : user.club;

  const activeNewsBooster = await loadActiveNewsBooster(club.id);
  return toClubSnapshot(club, activeNewsBooster);
}

/** Profile / trophy-room payload for the session user. */
export async function getProfileSnapshot(): Promise<ProfileSnapshot | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      club: {
        include: {
          badges: {
            select: { badgeSlug: true, unlockedAt: true },
            orderBy: { unlockedAt: "desc" },
          },
        },
      },
    },
  });

  if (!user?.club) return null;
  const club = user.club;

  return {
    managerName: user.displayName ?? "Manager",
    clubName: club.name,
    stadiumName: club.stadiumName,
    avatar: club.avatar,
    flag: club.flag,
    colorKey: club.colorKey,
    xp: user.xp,
    matchesPlayed: club.matchesPlayed,
    matchesWon: club.matchesWon,
    goalsTotal: club.goalsTotal,
    highestCombo: club.highestCombo,
    dailyStreak: club.dailyStreak,
    longestDailyStreak: club.longestDailyStreak,
    badges: club.badges.map((b) => ({
      slug: b.badgeSlug,
      unlockedAt: b.unlockedAt.toISOString(),
    })),
  };
}

/**
 * Require an authenticated user that already has a club.
 * Used by economy / match actions (no silent dummy fallback).
 */
export async function requireUserClub(
  db: Db = prisma,
): Promise<{ user: User; club: Club } | null> {
  const user = await getCurrentUser(db);
  if (!user?.club) return null;
  return { user, club: user.club };
}
