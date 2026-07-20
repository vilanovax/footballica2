"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDummyUser } from "@/lib/dev/dummyClub";
import { isAvatarKey } from "@/lib/onboarding/avatars";

export type CreateClubResult = { ok: false; error: string };

const MAX_NAME_LENGTH = 24;

/**
 * Onboarding: create the player's club for the dummy user with starting stats.
 * On success it redirects to /club (so it only returns on validation failure).
 */
export async function createClub(
  avatar: string,
  rawName: string,
): Promise<CreateClubResult> {
  const name = rawName.trim();

  if (!isAvatarKey(avatar)) {
    return { ok: false, error: "Please pick a manager." };
  }
  if (name.length < 2) {
    return { ok: false, error: "Team name is too short." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Keep it under ${MAX_NAME_LENGTH} characters.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await getOrCreateDummyUser(tx);

      // Idempotent: don't overwrite an existing club.
      const existing = await tx.club.findUnique({ where: { userId: user.id } });
      if (existing) return;

      await tx.club.create({
        data: {
          userId: user.id,
          name,
          avatar,
          // Starting stats — ruined Division 3 club.
          coins: 0,
          fans: 0,
          stamina: 3,
          maxStamina: 3,
          stadiumLevel: 0,
          pitchLevel: 0,
          medicalLevel: 0,
          trainingGroundLevel: 0,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { managerAvatar: avatar },
      });
    });
  } catch (err) {
    console.error("createClub failed", err);
    return { ok: false, error: "Could not create your club. Try again." };
  }

  revalidatePath("/club");
  redirect("/club");
}
