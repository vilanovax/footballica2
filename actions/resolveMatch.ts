"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateDummyClub } from "@/lib/dev/dummyClub";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import {
  computeRewards,
  verifyKickLog,
  type KickSubmission,
  type MatchRewards,
} from "@/lib/quiz/scoring";
import { applyBoosters, type BoosterType } from "@/lib/boosters/boosters";
import { computeStaminaRegen } from "@/lib/club/stamina";

const STAMINA_COST = 1;

/** Guaranteed FTUE payout — exactly the cost of the first Stadium upgrade. */
const TUTORIAL_REWARD = { coins: 100, xp: 20, fans: 10 } as const;

/** User-facing validation failure that aborts the transaction. */
class MatchError extends Error {}

export type ResolveMatchOptions = {
  /** FTUE tutorial match: fixed payout, no stamina cost, advances tutorialStep. */
  tutorial?: boolean;
};

export type ResolveMatchResult =
  | {
      ok: true;
      rewards: MatchRewards;
      balances: {
        coins: number;
        fans: number;
        stamina: number;
        maxStamina: number;
        xp: number;
        managerLevel: number;
        tutorialStep: number;
      };
    }
  | { ok: false; error: string };

/**
 * Anti-cheat match resolution. The client sends ONLY its raw kick submissions
 * (question id, chosen index, time left). The server re-derives correctness
 * from its own question bank and recomputes rewards with the same pure
 * `computeRewards` used on the client — the client's numbers are never trusted.
 */
export async function resolveMatch(
  submissions: KickSubmission[],
  options: ResolveMatchOptions = {},
): Promise<ResolveMatchResult> {
  const isTutorial = options.tutorial === true;

  if (!Array.isArray(submissions) || submissions.length === 0) {
    return { ok: false, error: "No kicks submitted." };
  }

  // Server-authoritative source of truth for answers: re-fetch the exact
  // questions the client claims to have played from the DB, then recompute
  // correctness. A tampered client cannot fabricate goals for ids it did not
  // actually receive (unknown ids throw inside verifyKickLog).
  let verifiedLog;
  try {
    const ids = [...new Set(submissions.map((s) => s.questionId))];
    const rows = await prisma.question.findMany({ where: { id: { in: ids } } });
    verifiedLog = verifyKickLog(rows.map(dbQuestionToQuiz), submissions);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid submission.",
    };
  }

  const baseRewards = computeRewards(verifiedLog);

  try {
    const { rewards, balances } = await prisma.$transaction(async (tx) => {
      const { user, club } = await getOrCreateDummyClub(tx);

      // Regenerate stamina first, then enforce the gate server-side. This
      // blocks anyone bypassing the UI blocker to grind with no stamina.
      // The FTUE tutorial match is exempt: it never spends stamina.
      const regen = computeStaminaRegen(club);
      const staminaSpent = isTutorial ? 0 : STAMINA_COST;

      if (!isTutorial && regen.stamina < STAMINA_COST) {
        throw new MatchError("Not enough stamina.");
      }
      const spentStamina = regen.stamina - staminaSpent;
      // If they were full, the regen clock starts now; otherwise carry anchor.
      const staminaAnchor =
        regen.stamina >= club.maxStamina ? new Date() : regen.lastStaminaUpdate;

      // Tutorial payout is fixed & booster-free (guaranteed first-upgrade coins).
      // Real matches recompute securely and apply any active Newspaper boosters.
      let finalRewards: MatchRewards;
      if (isTutorial) {
        finalRewards = {
          ...baseRewards,
          coins: TUTORIAL_REWARD.coins,
          xp: TUTORIAL_REWARD.xp,
          fans: TUTORIAL_REWARD.fans,
        };
      } else {
        const activeBoosters = await tx.activeBooster.findMany({
          where: { clubId: club.id, expiresAt: { gt: new Date() } },
          select: { type: true, multiplier: true },
        });
        finalRewards = applyBoosters(
          baseRewards,
          activeBoosters.map((b) => ({
            type: b.type as BoosterType,
            multiplier: b.multiplier,
          })),
        );
      }

      await tx.match.create({
        data: {
          userId: user.id,
          clubId: club.id,
          mode: isTutorial ? "TUTORIAL" : "PENALTY",
          status: "COMPLETED",
          goalsFor: finalRewards.goals,
          goalsAgainst: finalRewards.misses,
          questionsTotal: verifiedLog.length,
          correctCount: finalRewards.goals,
          coinsEarned: finalRewards.coins,
          xpEarned: finalRewards.xp,
          fansEarned: finalRewards.fans,
          staminaSpent,
          answerLog: verifiedLog as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      // Advance FTUE: after the tutorial match the player must buy the first
      // upgrade next (step 0 → 1). Never regress an already-progressed club.
      const nextTutorialStep =
        isTutorial && club.tutorialStep === 0 ? 1 : club.tutorialStep;

      const updatedClub = await tx.club.update({
        where: { id: club.id },
        data: {
          coins: { increment: finalRewards.coins },
          fans: { increment: finalRewards.fans },
          // Absolute set: regen already accounted for above.
          stamina: spentStamina,
          lastStaminaUpdate: staminaAnchor,
          tutorialStep: nextTutorialStep,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: finalRewards.xp },
          weeklyXp: { increment: finalRewards.xp },
        },
      });

      return {
        rewards: finalRewards,
        balances: {
          coins: updatedClub.coins,
          fans: updatedClub.fans,
          stamina: updatedClub.stamina,
          maxStamina: updatedClub.maxStamina,
          xp: updatedUser.xp,
          managerLevel: updatedUser.managerLevel,
          tutorialStep: updatedClub.tutorialStep,
        },
      };
    });

    revalidatePath("/club");

    return { ok: true, rewards, balances };
  } catch (err) {
    if (err instanceof MatchError) {
      return { ok: false, error: err.message };
    }
    console.error("resolveMatch failed", err);
    return {
      ok: false,
      error: "Could not save results. Please try again.",
    };
  }
}
