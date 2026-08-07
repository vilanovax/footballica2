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
  settleClubBankInterest,
  settleSponsorOffice,
} from "@/lib/club/businessService";
import {
  dealExpiresAt,
  getSponsorTemplate,
  sponsorOfficeUpgradeCost,
  sponsorSlotsAtLevel,
} from "@/lib/club/sponsorOffice";

export type SponsorActionResult =
  | { ok: true; club: ClubSnapshot }
  | { ok: false; error: string };

class SponsorError extends Error {}

/** Build Sponsor Office at level 1. */
export async function buildSponsorOffice(): Promise<SponsorActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new SponsorError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      club = await settleSponsorOffice(club, tx);
      const config = await getGameConfig();
      const so = config.businessEconomy.sponsorOffice;
      if (!so.enabled) throw new SponsorError("SPONSOR_OFFLINE");
      if (club.sponsorOfficeLevel >= 1) {
        throw new SponsorError("Already built.");
      }
      const playerLevel = calculateLevel(user.xp).level;
      if (playerLevel < so.unlockPlayerLevel) {
        throw new SponsorError("Player level too low.");
      }
      if (club.clubFunds < so.buildCost) {
        throw new SponsorError("NEED_FUNDS");
      }
      const now = new Date();
      const updated = await tx.club.update({
        where: { id: club.id },
        data: {
          sponsorOfficeLevel: 1,
          clubFunds: { decrement: so.buildCost },
          lastSponsorPayoutAt: now,
        },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof SponsorError) {
      return { ok: false, error: err.message };
    }
    console.error("buildSponsorOffice failed", err);
    return { ok: false, error: "Build failed. Please try again." };
  }
}

/** Upgrade Sponsor Office level (more deal slots). */
export async function upgradeSponsorOffice(): Promise<SponsorActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new SponsorError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      club = await settleSponsorOffice(club, tx);
      const config = await getGameConfig();
      const so = config.businessEconomy.sponsorOffice;
      if (!so.enabled) throw new SponsorError("SPONSOR_OFFLINE");
      if (club.sponsorOfficeLevel < 1) {
        throw new SponsorError("Build the office first.");
      }
      const cost = sponsorOfficeUpgradeCost(club.sponsorOfficeLevel, config);
      if (cost === null) throw new SponsorError("Already at max level.");
      if (club.clubFunds < cost) throw new SponsorError("NEED_FUNDS");
      const updated = await tx.club.update({
        where: { id: club.id },
        data: {
          sponsorOfficeLevel: { increment: 1 },
          clubFunds: { decrement: cost },
        },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof SponsorError) {
      return { ok: false, error: err.message };
    }
    console.error("upgradeSponsorOffice failed", err);
    return { ok: false, error: "Upgrade failed. Please try again." };
  }
}

/** Sign (or replace) a sponsor deal into a slot. */
export async function signSponsorDeal(
  slotIndex: number,
  sponsorKey: string,
): Promise<SponsorActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new SponsorError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      club = await settleSponsorOffice(club, tx);
      const config = await getGameConfig();
      const so = config.businessEconomy.sponsorOffice;
      if (!so.enabled) throw new SponsorError("SPONSOR_OFFLINE");
      if (club.sponsorOfficeLevel < 1) {
        throw new SponsorError("Build the office first.");
      }
      const slots = sponsorSlotsAtLevel(club.sponsorOfficeLevel, config);
      if (
        !Number.isInteger(slotIndex) ||
        slotIndex < 0 ||
        slotIndex >= slots
      ) {
        throw new SponsorError("Invalid slot.");
      }
      const template = getSponsorTemplate(sponsorKey, config);
      if (!template) throw new SponsorError("Unknown sponsor.");
      const playerLevel = calculateLevel(user.xp).level;
      if (playerLevel < template.requiresPlayerLevel) {
        throw new SponsorError("Player level too low.");
      }
      if (club.fans < template.requiresFans) {
        throw new SponsorError("Need more fans.");
      }
      if (club.stadiumLevel < template.requiresStadiumLevel) {
        throw new SponsorError("Stadium too small.");
      }
      if (club.clubFunds < template.signCost) {
        throw new SponsorError("NEED_FUNDS");
      }

      const now = new Date();
      const expiresAt = dealExpiresAt(template, now);

      await tx.club.update({
        where: { id: club.id },
        data: { clubFunds: { decrement: template.signCost } },
      });

      await tx.clubSponsorDeal.upsert({
        where: {
          clubId_slotIndex: { clubId: club.id, slotIndex },
        },
        create: {
          clubId: club.id,
          slotIndex,
          sponsorKey: template.key,
          signedAt: now,
          expiresAt,
        },
        update: {
          sponsorKey: template.key,
          signedAt: now,
          expiresAt,
        },
      });

      const updated = await tx.club.findUniqueOrThrow({
        where: { id: club.id },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof SponsorError) {
      return { ok: false, error: err.message };
    }
    console.error("signSponsorDeal failed", err);
    return { ok: false, error: "Sign failed. Please try again." };
  }
}

/** Clear a deal slot (no refund). */
export async function clearSponsorDeal(
  slotIndex: number,
): Promise<SponsorActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new SponsorError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      club = await settleSponsorOffice(club, tx);
      await tx.clubSponsorDeal.deleteMany({
        where: { clubId: club.id, slotIndex },
      });
      const updated = await tx.club.findUniqueOrThrow({
        where: { id: club.id },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof SponsorError) {
      return { ok: false, error: err.message };
    }
    console.error("clearSponsorDeal failed", err);
    return { ok: false, error: "Clear failed. Please try again." };
  }
}
