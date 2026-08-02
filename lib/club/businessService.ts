import "server-only";

import type {
  Club,
  ClubFacility,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import { calculateLevel } from "@/lib/game/economy";
import { getGameConfig } from "@/lib/game/gameConfig";
import {
  BUSINESS_FACILITY_KEYS,
  buildBusinessSnapshot,
  type BusinessFacilityKey,
  type BusinessSnapshot,
  type FacilityRow,
} from "@/lib/club/businessEconomy";

type Db = PrismaClient | Prisma.TransactionClient;

/** Ensure all three facility rows exist; unlock AVAILABLE by player level. */
export async function ensureClubFacilities(
  clubId: string,
  playerLevel: number,
  db: Db,
): Promise<ClubFacility[]> {
  const config = await getGameConfig();
  const existing = await db.clubFacility.findMany({ where: { clubId } });
  const have = new Set(existing.map((r) => r.key));

  for (const key of BUSINESS_FACILITY_KEYS) {
    if (have.has(key)) continue;
    const def = config.businessEconomy.facilities[key];
    const status =
      playerLevel >= def.unlockPlayerLevel ? "AVAILABLE" : "LOCKED";
    await db.clubFacility.create({
      data: { clubId, key, status, level: 0 },
    });
  }

  const rows = await db.clubFacility.findMany({ where: { clubId } });
  // Promote LOCKED → AVAILABLE when level gate is met (never demote BUILT).
  for (const row of rows) {
    if (row.status !== "LOCKED") continue;
    const def =
      config.businessEconomy.facilities[row.key as BusinessFacilityKey];
    if (playerLevel >= def.unlockPlayerLevel) {
      await db.clubFacility.update({
        where: { id: row.id },
        data: { status: "AVAILABLE" },
      });
    }
  }

  return db.clubFacility.findMany({ where: { clubId } });
}

/**
 * One-time Funds seed for clubs that never engaged the business layer
 * (FTUE complete or tutorial past step 0, zero funds, nothing built).
 */
export async function maybeSeedClubFunds(
  club: Club,
  playerLevel: number,
  db: Db,
): Promise<Club> {
  if (club.tutorialStep < 1) return club;
  if (club.clubFunds > 0 || club.vaultBalance > 0) return club;

  const built = await db.clubFacility.count({
    where: { clubId: club.id, status: "BUILT" },
  });
  if (built > 0) return club;

  const config = await getGameConfig();
  return db.club.update({
    where: { id: club.id },
    data: { clubFunds: config.businessEconomy.seedFunds },
  });
}

export function facilitiesToRows(rows: ClubFacility[]): FacilityRow[] {
  return rows.map((r) => ({
    key: r.key as BusinessFacilityKey,
    status: r.status as FacilityRow["status"],
    level: r.level,
    storedAmount: r.storedAmount,
    lastCalculatedAt: r.lastCalculatedAt,
    version: r.version,
  }));
}

export async function loadBusinessSnapshot(
  club: Club,
  userXp: number,
  db: Db,
): Promise<{ club: Club; business: BusinessSnapshot }> {
  const playerLevel = calculateLevel(userXp).level;
  await ensureClubFacilities(club.id, playerLevel, db);
  const seeded = await maybeSeedClubFunds(club, playerLevel, db);
  const rows = await db.clubFacility.findMany({ where: { clubId: seeded.id } });
  const config = await getGameConfig();
  const business = buildBusinessSnapshot({
    clubFunds: seeded.clubFunds,
    vaultBalance: seeded.vaultBalance,
    vaultLevel: seeded.vaultLevel,
    fans: seeded.fans,
    playerLevel,
    facilities: facilitiesToRows(rows),
    config,
  });
  return { club: seeded, business };
}
