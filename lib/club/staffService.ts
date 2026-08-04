import "server-only";

import type { Club, ClubStaff, Prisma, PrismaClient } from "@/generated/prisma/client";
import { getGameConfig } from "@/lib/game/gameConfig";
import {
  BUSINESS_FACILITY_KEYS,
  getFacilityDef,
  incomeBoostMultiplier,
  rateAtLevel,
  settleFacilityAmount,
  storageCapAtLevel,
  vaultAccepts,
  vaultCapacity,
  type BusinessFacilityKey,
} from "@/lib/club/businessEconomy";
import {
  staffRateMultiplier,
  toStaffMemberView,
  type StaffMemberView,
  type StaffRole,
} from "@/lib/club/staff";

type Db = PrismaClient | Prisma.TransactionClient;

export function staffRowsToViews(rows: ClubStaff[]): StaffMemberView[] {
  return rows.map((r) =>
    toStaffMemberView({
      id: r.id,
      templateKey: r.templateKey,
      avatarKey: r.avatarKey,
      role: r.role as StaffRole,
      rateBonusPercent: r.rateBonusPercent,
      assignedFacilityKey: r.assignedFacilityKey as BusinessFacilityKey | null,
    }),
  );
}

/**
 * Lazy auto-collect: assigned staff move a full facility buffer into the Safe.
 * Persists facility + vault when anything moves. No income mint cron.
 */
export async function settleStaffAutoCollect(
  club: Club,
  db: Db,
  now: Date = new Date(),
): Promise<Club> {
  const config = await getGameConfig();
  if (!config.businessEconomy.staff.enabled) return club;

  const staffRows = await db.clubStaff.findMany({ where: { clubId: club.id } });
  const assigned = staffRows.filter((s) => s.assignedFacilityKey != null);
  if (assigned.length === 0) return club;

  const bonusByKey = new Map<BusinessFacilityKey, number>();
  for (const s of assigned) {
    bonusByKey.set(
      s.assignedFacilityKey as BusinessFacilityKey,
      s.rateBonusPercent,
    );
  }

  const facilities = await db.clubFacility.findMany({
    where: { clubId: club.id, status: "BUILT" },
  });
  const rateBoost = incomeBoostMultiplier(
    club.businessBoostExpiresAt,
    now,
    config,
  );

  let totalRate = 0;
  for (const row of facilities) {
    const key = row.key as BusinessFacilityKey;
    const def = getFacilityDef(key, config);
    const mult = staffRateMultiplier(bonusByKey.get(key) ?? 0);
    totalRate += rateAtLevel(
      def,
      row.level,
      club.fans,
      config,
      rateBoost * mult,
    );
  }

  let vaultBal = club.vaultBalance;
  const vCap = vaultCapacity(club.vaultLevel, totalRate, config);
  let moved = 0;

  for (const row of facilities) {
    const key = row.key as BusinessFacilityKey;
    if (!bonusByKey.has(key)) continue;

    const def = getFacilityDef(key, config);
    const mult = staffRateMultiplier(bonusByKey.get(key) ?? 0);
    const rate = rateAtLevel(
      def,
      row.level,
      club.fans,
      config,
      rateBoost * mult,
    );
    const cap = storageCapAtLevel(
      def,
      row.level,
      club.fans,
      config,
      rateBoost * mult,
    );
    const settled = settleFacilityAmount(
      row.storedAmount,
      row.lastCalculatedAt,
      rate,
      cap,
      now,
    );

    // Only auto-collect when buffer is full.
    if (settled.storedAmount < cap || cap <= 0) {
      if (settled.storedAmount !== row.storedAmount) {
        await db.clubFacility.update({
          where: { id: row.id },
          data: {
            storedAmount: settled.storedAmount,
            lastCalculatedAt: now,
            version: { increment: 1 },
          },
        });
      }
      continue;
    }

    const take = vaultAccepts(vaultBal, vCap, settled.storedAmount);
    if (take <= 0) {
      if (settled.storedAmount !== row.storedAmount) {
        await db.clubFacility.update({
          where: { id: row.id },
          data: {
            storedAmount: settled.storedAmount,
            lastCalculatedAt: now,
            version: { increment: 1 },
          },
        });
      }
      continue;
    }

    const left = settled.storedAmount - take;
    vaultBal += take;
    moved += take;
    await db.clubFacility.update({
      where: { id: row.id },
      data: {
        storedAmount: left,
        lastCalculatedAt: now,
        version: { increment: 1 },
      },
    });
  }

  if (moved <= 0 && vaultBal === club.vaultBalance) return club;

  return db.club.update({
    where: { id: club.id },
    data: { vaultBalance: vaultBal },
  });
}

export async function loadClubStaffViews(
  clubId: string,
  db: Db,
): Promise<StaffMemberView[]> {
  const rows = await db.clubStaff.findMany({
    where: { clubId },
    orderBy: { hiredAt: "asc" },
  });
  return staffRowsToViews(rows);
}

/** True when club has a hired Treasurer (bench or assigned). */
export function clubHasTreasurer(rows: ClubStaff[]): boolean {
  return rows.some((r) => r.role === "TREASURER");
}

export function isFacilityKey(
  raw: string | null | undefined,
): raw is BusinessFacilityKey {
  return (
    typeof raw === "string" &&
    (BUSINESS_FACILITY_KEYS as string[]).includes(raw)
  );
}
