"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
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
  canWithdrawVault,
  vaultAccepts,
  vaultCapacity,
  vaultUpgradeCost,
  type BusinessFacilityKey,
  type FacilitySoftLinks,
} from "@/lib/club/businessEconomy";
import {
  ensureClubFacilities,
  settleClubBankInterest,
  settleSponsorOffice,
} from "@/lib/club/businessService";
import {
  isBranchMilestone,
  isFacilityBranch,
  parseBranchPicks,
  type FacilityBranch,
} from "@/lib/club/facilityBranches";
import {
  clubHasTreasurer,
  loadClubStaffViews,
  settleStaffAutoCollect,
} from "@/lib/club/staffService";
import { staffBonusByFacility, staffRateMultiplier } from "@/lib/club/staff";
import { sponsorFacilityRateMult } from "@/lib/club/sponsorOffice";
import { loadMuseumBadgeRefs } from "@/lib/club/loadMuseumBadges";
import { museumTrophyFactorFromBadges } from "@/lib/club/museumTrophies";

export type BusinessActionResult =
  | { ok: true; club: ClubSnapshot; transferred?: number }
  | { ok: false; error: string };

class BusinessError extends Error {}

function isFacilityKey(raw: string): raw is BusinessFacilityKey {
  return (BUSINESS_FACILITY_KEYS as string[]).includes(raw);
}

async function softLinksForClub(
  clubId: string,
  stadiumLevel: number,
  db: Prisma.TransactionClient,
): Promise<FacilitySoftLinks> {
  const museumBadges = await loadMuseumBadgeRefs(clubId, db);
  const deals = await db.clubSponsorDeal.findMany({ where: { clubId } });
  const config = await getGameConfig();
  const sponsorRateMult = sponsorFacilityRateMult(
    deals.map((d) => ({
      slotIndex: d.slotIndex,
      sponsorKey: d.sponsorKey,
      signedAt: d.signedAt,
      expiresAt: d.expiresAt,
    })),
    config,
  );
  return {
    badgeCount: museumBadges.length,
    museumTrophyMult: museumTrophyFactorFromBadges(museumBadges, config),
    stadiumLevel,
    sponsorRateMult,
  };
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
      club = await settleSponsorOffice(club, tx);
      club = await settleStaffAutoCollect(club, tx);
      const config = await getGameConfig();
      const playerLevel = calculateLevel(user.xp).level;
      const now = new Date();

      await ensureClubFacilities(club.id, playerLevel, tx);
      const rows = await tx.clubFacility.findMany({
        where: { clubId: club.id, status: "BUILT" },
      });
      const staffMembers = await loadClubStaffViews(club.id, tx);
      const bonusBy = staffBonusByFacility(staffMembers);
      const links = await softLinksForClub(
        club.id,
        club.stadiumLevel,
        tx,
      );
      const rateBoost = incomeBoostMultiplier(
        club.businessBoostExpiresAt,
        now,
        config,
      );

      let totalRate = 0;
      for (const row of rows) {
        const fKey = row.key as BusinessFacilityKey;
        const def = getFacilityDef(fKey, config);
        const mult = staffRateMultiplier(bonusBy[fKey] ?? 0);
        const fLinks: FacilitySoftLinks = {
          ...links,
          branchPicks: parseBranchPicks(row.branchPicks),
        };
        totalRate += rateAtLevel(
          def,
          row.level,
          club.fans,
          config,
          rateBoost * mult,
          fLinks,
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
        const mult = staffRateMultiplier(bonusBy[fKey] ?? 0);
        const fLinks: FacilitySoftLinks = {
          ...links,
          branchPicks: parseBranchPicks(row.branchPicks),
        };
        const rate = rateAtLevel(
          def,
          row.level,
          club.fans,
          config,
          rateBoost * mult,
          fLinks,
        );
        const cap = storageCapAtLevel(
          def,
          row.level,
          club.fans,
          config,
          rateBoost * mult,
          fLinks,
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

/** Move vault balance into spendable Club Funds — only when Safe is full (Phase A). */
export async function withdrawVault(): Promise<BusinessActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BusinessError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      club = await settleSponsorOffice(club, tx);
      club = await settleStaffAutoCollect(club, tx);
      if (club.vaultBalance <= 0) {
        throw new BusinessError("Vault is empty.");
      }

      const config = await getGameConfig();
      const now = new Date();
      const staffRows = await tx.clubStaff.findMany({
        where: { clubId: club.id },
      });
      const staffMembers = await loadClubStaffViews(club.id, tx);
      const bonusBy = staffBonusByFacility(staffMembers);
      const links = await softLinksForClub(
        club.id,
        club.stadiumLevel,
        tx,
      );
      const rateBoost = incomeBoostMultiplier(
        club.businessBoostExpiresAt,
        now,
        config,
      );
      const rows = await tx.clubFacility.findMany({
        where: { clubId: club.id, status: "BUILT" },
      });
      let totalRate = 0;
      for (const row of rows) {
        const fKey = row.key as BusinessFacilityKey;
        const def = getFacilityDef(fKey, config);
        const mult = staffRateMultiplier(bonusBy[fKey] ?? 0);
        const fLinks: FacilitySoftLinks = {
          ...links,
          branchPicks: parseBranchPicks(row.branchPicks),
        };
        totalRate += rateAtLevel(
          def,
          row.level,
          club.fans,
          config,
          rateBoost * mult,
          fLinks,
        );
      }
      const vCap = vaultCapacity(club.vaultLevel, totalRate, config);
      if (
        !canWithdrawVault(club.vaultBalance, vCap, {
          hasTreasurer: clubHasTreasurer(staffRows),
        })
      ) {
        throw new BusinessError("VAULT_NOT_FULL");
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

/** Settle buffer at old rate, then level++. Milestone levels need a branch. */
export async function upgradeFacility(
  key: string,
  branch?: string | null,
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

      const nextLevel = row.level + 1;
      const picks = parseBranchPicks(row.branchPicks);
      let nextPicks: FacilityBranch[] = picks;
      if (isBranchMilestone(nextLevel, config)) {
        if (!isFacilityBranch(branch)) {
          throw new BusinessError("BRANCH_REQUIRED");
        }
        nextPicks = [...picks, branch];
      }

      const rateBoost = incomeBoostMultiplier(
        club.businessBoostExpiresAt,
        now,
        config,
      );
      const links = await softLinksForClub(
        club.id,
        club.stadiumLevel,
        tx,
      );
      const fLinks: FacilitySoftLinks = {
        ...links,
        branchPicks: picks,
      };
      const rate = rateAtLevel(
        def,
        row.level,
        club.fans,
        config,
        rateBoost,
        fLinks,
      );
      const cap = storageCapAtLevel(
        def,
        row.level,
        club.fans,
        config,
        rateBoost,
        fLinks,
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
          branchPicks: nextPicks,
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
