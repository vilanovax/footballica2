"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireUserClub,
  toClubSnapshotWithBooster,
} from "@/lib/player/current";
import { getGameConfig } from "@/lib/game/gameConfig";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { settleClubBankInterest } from "@/lib/club/businessService";

export type BankActionResult =
  | { ok: true; club: ClubSnapshot }
  | { ok: false; error: string };

class BankError extends Error {}

/** Opt in to sponsored bank (pays upgradeCost from spendable Funds). */
export async function activateSponsoredBank(): Promise<BankActionResult> {
  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BankError("Not authenticated.");
      let { club } = pair;
      const config = await getGameConfig();
      const sb = config.businessEconomy.sponsoredBank;

      if (!sb.enabled) throw new BankError("Sponsored bank is offline.");
      club = await settleClubBankInterest(club, tx);
      if (club.sponsoredBankActive) {
        throw new BankError("Already on sponsored bank.");
      }
      if (club.clubFunds < sb.upgradeCost) {
        throw new BankError("Not enough Bank balance.");
      }

      const now = new Date();
      const updated = await tx.club.update({
        where: { id: club.id },
        data: {
          clubFunds: club.clubFunds - sb.upgradeCost,
          sponsoredBankActive: true,
          lastBankInterestAt: now,
        },
      });
      return toClubSnapshotWithBooster(updated, tx, pair.user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: snapshot };
  } catch (err) {
    if (err instanceof BankError) return { ok: false, error: err.message };
    console.error("activateSponsoredBank failed", err);
    return { ok: false, error: "Could not upgrade bank." };
  }
}

/** Opt out — no refund; interest stops. */
export async function deactivateSponsoredBank(): Promise<BankActionResult> {
  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new BankError("Not authenticated.");
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      if (!club.sponsoredBankActive) {
        throw new BankError("Already on club bank.");
      }
      const updated = await tx.club.update({
        where: { id: club.id },
        data: { sponsoredBankActive: false },
      });
      return toClubSnapshotWithBooster(updated, tx, pair.user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: snapshot };
  } catch (err) {
    if (err instanceof BankError) return { ok: false, error: err.message };
    console.error("deactivateSponsoredBank failed", err);
    return { ok: false, error: "Could not switch bank." };
  }
}
