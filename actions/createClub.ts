"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/player/current";
import { isAvatarKey } from "@/lib/onboarding/avatars";
import { validateClubName } from "@/lib/auth/blacklist";

export type CreateClubResult = { ok: false; error: string };

/**
 * Onboarding: create the player's club for the authenticated session user.
 * On success redirects to /club (only returns on validation failure).
 */
export async function createClub(
  avatar: string,
  rawName: string,
): Promise<CreateClubResult> {
  if (!isAvatarKey(avatar)) {
    return { ok: false, error: "invalid_avatar" };
  }

  const validated = validateClubName(rawName);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "not_authenticated" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.club.findUnique({ where: { userId: user.id } });
      if (existing) return;

      await tx.club.create({
        data: {
          userId: user.id,
          name: validated.name,
          nameNormalized: validated.normalized,
          avatar,
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
        data: {
          managerAvatar: avatar,
          displayName: user.displayName ?? "Manager",
        },
      });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "name_taken" };
    }
    console.error("createClub failed", err);
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/club");
  redirect("/club");
}
