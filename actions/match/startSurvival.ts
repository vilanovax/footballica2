"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { getGameConfig } from "@/lib/game/gameConfig";
import { isRecordChallengeLive } from "@/lib/game/recordChallenge";
import { isCategoryAllowedForChallenge } from "@/lib/game/challengeCategories";

export type StartSurvivalResult =
  | {
      ok: true;
      categoryId: string;
      challengeId: string | null;
      /** Stamina is spent on settle — this only gates entry. */
      stamina: number;
      maxStamina: number;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "invalid_category"
        | "not_enough_stamina"
        | "challenge_required"
        | "challenge_locked"
        | "challenge_not_live"
        | "challenge_category_mismatch"
        | "start_failed";
    };

/**
 * Gate a Survival (or Premium Challenge) kickoff.
 * Does NOT deduct stamina — settleSurvival spends config.survival.staminaCost.
 * Premium runs require ClubChallengeAccess (one-time unlock already paid).
 */
export async function startSurvival(input: {
  categoryId: string;
  challengeId?: string | null;
}): Promise<StartSurvivalResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "not_authenticated" };
    const { club } = pair;

    const categoryId =
      typeof input.categoryId === "string" ? input.categoryId.trim() : "";
    if (!categoryId) return { ok: false, error: "invalid_category" };

    const category = await prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true, challengeOnly: true },
    });
    if (!category) return { ok: false, error: "invalid_category" };

    const challengeId =
      typeof input.challengeId === "string" && input.challengeId.trim()
        ? input.challengeId.trim()
        : null;

    if (challengeId) {
      const challenge = await prisma.recordChallenge.findUnique({
        where: { id: challengeId },
      });
      if (!challenge || !isRecordChallengeLive(challenge)) {
        return { ok: false, error: "challenge_not_live" };
      }

      const allowed = await isCategoryAllowedForChallenge({
        categoryId,
        challengeId,
      });
      if (!allowed) {
        return { ok: false, error: "challenge_category_mismatch" };
      }

      const access = await prisma.clubChallengeAccess.findUnique({
        where: {
          clubId_challengeId: {
            clubId: club.id,
            challengeId,
          },
        },
      });
      if (!access) return { ok: false, error: "challenge_locked" };
    } else if (category.challengeOnly) {
      return { ok: false, error: "invalid_category" };
    }

    const fresh = await prisma.club.findUniqueOrThrow({
      where: { id: club.id },
      select: {
        stamina: true,
        maxStamina: true,
        lastStaminaUpdate: true,
      },
    });
    const config = await getGameConfig();
    const staminaCost = config.survival.staminaCost;
    const regen = computeStaminaRegen(fresh, new Date());
    if (regen.stamina < staminaCost) {
      return { ok: false, error: "not_enough_stamina" };
    }

    if (regen.stamina !== fresh.stamina) {
      await prisma.club.update({
        where: { id: club.id },
        data: {
          stamina: regen.stamina,
          lastStaminaUpdate: regen.lastStaminaUpdate,
        },
      });
    }

    return {
      ok: true,
      categoryId,
      challengeId,
      stamina: regen.stamina,
      maxStamina: fresh.maxStamina,
    };
  } catch (err) {
    console.error("[startSurvival]", err);
    return { ok: false, error: "start_failed" };
  }
}
