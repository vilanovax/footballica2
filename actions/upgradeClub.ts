"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDummyClub, toClubSnapshot } from "@/lib/dev/dummyClub";
import type { Prisma } from "@prisma/client";
import {
  UPGRADES,
  getUpgradeCost,
  type ClubSnapshot,
  type UpgradeKey,
} from "@/lib/club/upgrades";

export type UpgradeResult =
  | { ok: true; club: ClubSnapshot }
  | { ok: false; error: string };

/** Thrown for user-facing validation failures (aborts the transaction). */
class UpgradeError extends Error {}

/**
 * Secure club upgrade. The client sends only the upgrade KEY — never a cost.
 * The server reads the authoritative level + balance, recomputes the cost from
 * shared rules, verifies affordability, then deducts and increments atomically.
 */
export async function upgradeClub(key: UpgradeKey): Promise<UpgradeResult> {
  const def = UPGRADES[key];
  if (!def) return { ok: false, error: "Unknown upgrade." };

  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const { club } = await getOrCreateDummyClub(tx);

      const currentLevel = club[def.field];
      const cost = getUpgradeCost(key, currentLevel);

      if (cost === null) {
        throw new UpgradeError("Already at max level.");
      }
      if (club.coins < cost) {
        throw new UpgradeError("Not enough coins.");
      }

      const data: Prisma.ClubUpdateInput = {
        coins: { decrement: cost },
        [def.field]: { increment: 1 },
      };

      // Training Ground expands stamina capacity (and tops it up as a bonus).
      if (key === "TRAINING_GROUND") {
        data.maxStamina = { increment: 1 };
        data.stamina = { increment: 1 };
      }

      const updated = await tx.club.update({
        where: { id: club.id },
        data,
      });

      return toClubSnapshot(updated);
    });

    revalidatePath("/club");
    return { ok: true, club: snapshot };
  } catch (err) {
    if (err instanceof UpgradeError) {
      return { ok: false, error: err.message };
    }
    console.error("upgradeClub failed", err);
    return { ok: false, error: "Upgrade failed. Please try again." };
  }
}
