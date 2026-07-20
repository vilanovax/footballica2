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
