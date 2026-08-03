"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireUserClub,
  toClubSnapshotWithBooster,
} from "@/lib/player/current";
import { getGameConfig } from "@/lib/game/gameConfig";
import { calculateLevel } from "@/lib/game/economy";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import {
  BUSINESS_FACILITY_KEYS,
  buildCost,
  getFacilityDef,
  incomeBoostMultiplier,
  rateAtLevel,
  settleFacilityAmount,
  storageCapAtLevel,
  upgradeCost,
  vaultAccepts,
  vaultCapacity,
  vaultUpgradeCost,
  type BusinessFacilityKey,
} from "@/lib/club/businessEconomy";
import {
  ensureClubFacilities,
  settleClubBankInterest,
} from "@/lib/club/businessService";

export type BusinessActionResult =
  | { ok: true; club: ClubSnapshot; transferred?: number }
  | { ok: false; error: string };

class BusinessError extends Error {}

function isFacilityKey(raw: string): raw is BusinessFacilityKey {
  return (BUSINESS_FACILITY_KEYS as string[]).includes(raw);
}

/** Collect one facility buffer (or all) into the vault. */
export async function collectFacilities(
  key: BusinessFacilityKey | "ALL" = "ALL",
): Promise<BusinessActionResult> {
  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BusinessError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      const config = await getGameConfig();
      const playerLevel = calculateLevel(user.xp).level;
      const now = new Date();

      await ensureClubFacilities(club.id, playerLevel, tx);
      const rows = await tx.clubFacility.findMany({
        where: { clubId: club.id, status: "BUILT" },
      });
      const rateBoost = incomeBoostMultiplier(
        club.businessBoostExpiresAt,
        now,
        config,
      );

      let totalRate = 0;
      for (const row of rows) {
        const def = getFacilityDef(row.key as BusinessFacilityKey, config);
        totalRate += rateAtLevel(
          def,
          row.level,
          club.fans,
          config,
          rateBoost,
        );
      }
      let vaultBal = club.vaultBalance;
      const vCap = vaultCapacity(club.vaultLevel, totalRate, config);
      let transferred = 0;

      const targets =
        key === "ALL"
          ? rows
          : rows.filter((r) => r.key === key);

      for (const row of targets) {
        const fKey = row.key as BusinessFacilityKey;
        const def = getFacilityDef(fKey, config);
        const rate = rateAtLevel(
          def,
          row.level,
          club.fans,
          config,
          rateBoost,
        );
        const cap = storageCapAtLevel(
          def,
          row.level,
          club.fans,
          config,
          rateBoost,
        );
        const settled = settleFacilityAmount(
          row.storedAmount,
          row.lastCalculatedAt,
          rate,
          cap,
          now,
        );
        const take = vaultAccepts(vaultBal, vCap, settled.storedAmount);
        const left = settled.storedAmount - take;
        vaultBal += take;
        transferred += take;

        const updated = await tx.clubFacility.updateMany({
          where: { id: row.id, version: row.version },
          data: {
            storedAmount: left,
            lastCalculatedAt: now,
            version: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          throw new BusinessError("Please try again.");
        }
      }

      const updatedClub = await tx.club.update({
        where: { id: club.id },
        data: { vaultBalance: vaultBal },
      });

      const clubSnap = await toClubSnapshotWithBooster(
        updatedClub,
        tx,
        user.xp,
      );
      return { clubSnap, transferred };
    });

    revalidatePath("/club");
    return {
      ok: true,
      club: snapshot.clubSnap,
      transferred: snapshot.transferred,
    };
  } catch (err) {
    if (err instanceof BusinessError) {
      return { ok: false, error: err.message };
    }
    console.error("collectFacilities failed", err);
    return { ok: false, error: "Collect failed. Please try again." };
  }
}

/** Move vault balance into spendable Club Funds. */
export async function withdrawVault(): Promise<BusinessActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BusinessError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      if (club.vaultBalance <= 0) {
        throw new BusinessError("Vault is empty.");
      }
      const amount = club.vaultBalance;
      const updated = await tx.club.update({
        where: { id: club.id },
        data: {
          vaultBalance: 0,
          clubFunds: { increment: amount },
        },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof BusinessError) {
      return { ok: false, error: err.message };
    }
    console.error("withdrawVault failed", err);
    return { ok: false, error: "Withdraw failed. Please try again." };
  }
}

/** Pay build cost and open a facility at level 1. */
export async function buildFacility(
  key: string,
): Promise<BusinessActionResult> {
  if (!isFacilityKey(key)) {
    return { ok: false, error: "Unknown facility." };
  }
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BusinessError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      const config = await getGameConfig();
      const playerLevel = calculateLevel(user.xp).level;
      const def = getFacilityDef(key, config);
      const now = new Date();

      await ensureClubFacilities(club.id, playerLevel, tx);
      const row = await tx.clubFacility.findUnique({
        where: { clubId_key: { clubId: club.id, key } },
      });
      if (!row) throw new BusinessError("Facility missing.");
      if (row.status === "BUILT") {
        throw new BusinessError("Already built.");
      }
      if (playerLevel < def.unlockPlayerLevel) {
        throw new BusinessError("Player level too low.");
      }

      const cost = buildCost(def);
      if (club.clubFunds < cost) {
        throw new BusinessError("Not enough Club Funds.");
      }

      const fac = await tx.clubFacility.updateMany({
        where: { id: row.id, version: row.version },
        data: {
          status: "BUILT",
          level: 1,
          storedAmount: 0,
          lastCalculatedAt: now,
          version: { increment: 1 },
        },
      });
      if (fac.count === 0) throw new BusinessError("Please try again.");

      const updated = await tx.club.update({
        where: { id: club.id },
        data: { clubFunds: { decrement: cost } },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof BusinessError) {
      return { ok: false, error: err.message };
    }
    console.error("buildFacility failed", err);
    return { ok: false, error: "Build failed. Please try again." };
  }
}

/** Settle buffer at old rate, then level++. */
export async function upgradeFacility(
  key: string,
): Promise<BusinessActionResult> {
  if (!isFacilityKey(key)) {
    return { ok: false, error: "Unknown facility." };
  }
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BusinessError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      const config = await getGameConfig();
      const now = new Date();

      const row = await tx.clubFacility.findUnique({
        where: { clubId_key: { clubId: club.id, key } },
      });
      if (!row || row.status !== "BUILT") {
        throw new BusinessError("Build this facility first.");
      }

      const def = getFacilityDef(key, config);
      const cost = upgradeCost(def, row.level);
      if (cost === null) throw new BusinessError("Already at max level.");
      if (club.clubFunds < cost) {
        throw new BusinessError("Not enough Club Funds.");
      }

      const rateBoost = incomeBoostMultiplier(
        club.businessBoostExpiresAt,
        now,
        config,
      );
      const rate = rateAtLevel(def, row.level, club.fans, config, rateBoost);
      const cap = storageCapAtLevel(
        def,
        row.level,
        club.fans,
        config,
        rateBoost,
      );
      const settled = settleFacilityAmount(
        row.storedAmount,
        row.lastCalculatedAt,
        rate,
        cap,
        now,
      );

      const fac = await tx.clubFacility.updateMany({
        where: { id: row.id, version: row.version },
        data: {
          level: { increment: 1 },
          storedAmount: settled.storedAmount,
          lastCalculatedAt: now,
          version: { increment: 1 },
        },
      });
      if (fac.count === 0) throw new BusinessError("Please try again.");

      const updated = await tx.club.update({
        where: { id: club.id },
        data: { clubFunds: { decrement: cost } },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof BusinessError) {
      return { ok: false, error: err.message };
    }
    console.error("upgradeFacility failed", err);
    return { ok: false, error: "Upgrade failed. Please try again." };
  }
}

export async function upgradeVault(): Promise<BusinessActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BusinessError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      const config = await getGameConfig();
      const cost = vaultUpgradeCost(club.vaultLevel, config);
      if (cost === null) throw new BusinessError("Vault already maxed.");
      if (club.clubFunds < cost) {
        throw new BusinessError("Not enough Club Funds.");
      }
      const updated = await tx.club.update({
        where: { id: club.id },
        data: {
          clubFunds: { decrement: cost },
          vaultLevel: { increment: 1 },
        },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof BusinessError) {
      return { ok: false, error: err.message };
    }
    console.error("upgradeVault failed", err);
    return { ok: false, error: "Vault upgrade failed. Please try again." };
  }
}
