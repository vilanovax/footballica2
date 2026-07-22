"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { calculateLevel } from "@/lib/game/economy";
import { isFlagKey, isFlagUnlocked } from "@/lib/onboarding/flags";

export type SetClubFlagResult = { ok: true } | { ok: false; error: string };

/**
 * Persist the club's cosmetic flag. Premium flags are re-validated server-side
 * against the player's actual manager level (derived from lifetime XP) so a
 * tampered client can't equip a flag it hasn't earned.
 */
export async function setClubFlag(flag: string): Promise<SetClubFlagResult> {
  if (!isFlagKey(flag)) {
    return { ok: false, error: "invalid_flag" };
  }

  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "not_authenticated" };
    const { user, club } = pair;

    const level = calculateLevel(user.xp).level;
    if (!isFlagUnlocked(flag, level)) {
      return { ok: false, error: "locked_flag" };
    }

    await prisma.club.update({
      where: { id: club.id },
      data: { flag },
    });
  } catch (err) {
    console.error("setClubFlag failed", err);
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/profile");
  revalidatePath("/club");
  return { ok: true };
}
