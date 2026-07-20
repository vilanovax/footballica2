import "server-only";
import { prisma } from "@/lib/prisma";
import type { Club, Prisma, PrismaClient } from "@prisma/client";
import type { ClubSnapshot } from "@/lib/club/upgrades";

type Db = PrismaClient | Prisma.TransactionClient;

/** Stable id so repeated dev sessions reuse the same sandbox manager. */
const DEV_USER_EMAIL = "dev@footballica.local";

/** Serializable club shape shared with client components. */
export function toClubSnapshot(club: Club): ClubSnapshot {
  return {
    coins: club.coins,
    fans: club.fans,
    stamina: club.stamina,
    maxStamina: club.maxStamina,
    stadiumLevel: club.stadiumLevel,
    medicalLevel: club.medicalLevel,
    trainingGroundLevel: club.trainingGroundLevel,
  };
}

/**
 * Read-only fetch for rendering. Returns null when no dev club exists yet
 * (created lazily on first match/upgrade) so page renders cause no writes.
 */
export async function getDummyClubSnapshot(): Promise<ClubSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { email: DEV_USER_EMAIL },
    include: { club: true },
  });
  return user?.club ? toClubSnapshot(user.club) : null;
}

/**
 * TEMPORARY dev fallback until Onboarding/Auth exists.
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
