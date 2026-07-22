"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { isAvatarKey, MANAGER_AVATARS } from "@/lib/onboarding/avatars";
import {
  CLUB_NAME_MAX_LEN,
  validateClubName,
} from "@/lib/auth/blacklist";

export type UpdateProfileInput = {
  managerName: string;
  clubName: string;
  stadiumName: string;
  avatar: string;
};

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

const PERSON_NAME = z.string().trim().min(2, "too_short").max(24, "too_long");

const schema = z.object({
  managerName: PERSON_NAME,
  clubName: z
    .string()
    .trim()
    .min(2, "too_short")
    .max(CLUB_NAME_MAX_LEN, "too_long"),
  stadiumName: z.string().trim().max(24, "too_long"),
  avatar: z.string(),
});

/**
 * Update the player's identity (manager + club name, stadium, avatar).
 * Avatar selection is re-validated server-side: cosmetic avatars can only be
 * set if the club actually owns the badge that unlocks them (anti-tamper).
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }
  const { managerName, clubName, stadiumName, avatar } = parsed.data;

  if (!isAvatarKey(avatar)) {
    return { ok: false, error: "invalid_avatar" };
  }

  const validated = validateClubName(clubName);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "not_authenticated" };
    const { user, club } = pair;

    const def = MANAGER_AVATARS.find((a) => a.key === avatar);
    if (def?.lockedBy) {
      const owned = await prisma.clubBadge.findFirst({
        where: { clubId: club.id, badgeSlug: def.lockedBy },
        select: { id: true },
      });
      if (!owned) return { ok: false, error: "locked_avatar" };
    }

    await prisma.$transaction([
      prisma.club.update({
        where: { id: club.id },
        data: {
          name: validated.name,
          nameNormalized: validated.normalized,
          stadiumName: stadiumName.length > 0 ? stadiumName : null,
          avatar,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { displayName: managerName, managerAvatar: avatar },
      }),
    ]);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "name_taken" };
    }
    console.error("updateProfile failed", err);
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/profile");
  revalidatePath("/club");
  return { ok: true };
}
