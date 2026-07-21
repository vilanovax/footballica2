import "server-only";
import { prisma } from "@/lib/prisma";
import type { Club, Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { canClaimNews } from "@/lib/boosters/boosters";

// (regen also used to derive msUntilNext for the live countdown)

type Db = PrismaClient | Prisma.TransactionClient;

/** Stable id so repeated dev sessions reuse the same sandbox manager. */
export const DEV_USER_EMAIL = "dev@footballica.local";

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
    tutorialStep: club.tutorialStep,
    newsClaimable: canClaimNews(club.lastNewsClaim, new Date()),
  };
}

/**
 * Fetch for rendering with passive stamina regen applied on read. When stamina
 * has recovered, the new value + anchor are persisted so the DB stays truthful.
 * Returns null when no dev club exists yet (created lazily on first match).
 */
export async function getDummyClubSnapshot(): Promise<ClubSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { email: DEV_USER_EMAIL },
    include: { club: true },
  });

  if (!user?.club) return null;

  const regen = computeStaminaRegen(user.club);

  if (regen.changed) {
    const updated = await prisma.club.update({
      where: { id: user.club.id },
      data: {
        stamina: regen.stamina,
        lastStaminaUpdate: regen.lastStaminaUpdate,
      },
    });
    return toClubSnapshot(updated);
  }

  return toClubSnapshot(user.club);
}

/** Serializable player-profile shape (club + user + unlocked badges). */
export type ProfileSnapshot = {
  managerName: string;
  clubName: string;
  stadiumName: string | null;
  avatar: string | null;
  xp: number;
  matchesPlayed: number;
  matchesWon: number;
  goalsTotal: number;
  highestCombo: number;
  dailyStreak: number;
  longestDailyStreak: number;
  badges: { slug: string; unlockedAt: string }[];
};

/**
 * Everything the profile / trophy room needs in one read: user XP + name, the
 * club's denormalized career stats, and the set of unlocked badge slugs (with
 * dates). Returns null when the dev user hasn't finished onboarding yet.
 */
export async function getProfileSnapshot(): Promise<ProfileSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { email: DEV_USER_EMAIL },
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

/** True when the dev user already has a club (i.e. finished onboarding). */
export async function hasDummyClub(): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: DEV_USER_EMAIL },
    include: { club: true },
  });
  return Boolean(user?.club);
}

/**
 * Dev user WITHOUT auto-creating a club. Used by onboarding so the club is
 * created only after the player picks an avatar + names the team.
 */
export async function getOrCreateDummyUser(db: Db = prisma) {
  const existing = await db.user.findUnique({
    where: { email: DEV_USER_EMAIL },
    include: { club: true },
  });
  if (existing) return existing;

  return db.user.create({
    data: {
      email: DEV_USER_EMAIL,
      displayName: "Dev Manager",
    },
    include: { club: true },
  });
}

/**
 * TEMPORARY dev fallback until full Auth exists.
 * Returns a User + their Club, creating both on the fly if missing.
 */
export async function getOrCreateDummyClub(db: Db = prisma) {
  const existing = await db.user.findUnique({
    where: { email: DEV_USER_EMAIL },
    include: { club: true },
  });

  if (existing?.club) {
    return { user: existing, club: existing.club };
  }

  // User exists but club somehow missing → create just the club.
  if (existing && !existing.club) {
    const club = await db.club.create({
      data: { userId: existing.id, name: "Dev Rovers" },
    });
    return { user: existing, club };
  }

  const user = await db.user.create({
    data: {
      email: DEV_USER_EMAIL,
      displayName: "Dev Manager",
      managerAvatar: "TACTICAL_COACH",
      club: {
        create: { name: "Dev Rovers" },
      },
    },
    include: { club: true },
  });

  return { user, club: user.club! };
}
