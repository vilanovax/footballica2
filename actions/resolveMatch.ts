"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateDummyClub } from "@/lib/dev/dummyClub";
import { PENALTY_QUESTIONS } from "@/lib/quiz/mock-questions";
import {
  computeRewards,
  verifyKickLog,
  type KickSubmission,
  type MatchRewards,
} from "@/lib/quiz/scoring";

const STAMINA_COST = 1;

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
): Promise<ResolveMatchResult> {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return { ok: false, error: "No kicks submitted." };
  }

  // Server-authoritative source of truth for answers. Swap for a DB Question
  // lookup once the trivia bank is persisted.
  let verifiedLog;
  try {
    verifiedLog = verifyKickLog(PENALTY_QUESTIONS, submissions);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid submission.",
    };
  }

  const rewards = computeRewards(verifiedLog);

  try {
    const balances = await prisma.$transaction(async (tx) => {
      const { user, club } = await getOrCreateDummyClub(tx);

      await tx.match.create({
        data: {
          userId: user.id,
          clubId: club.id,
          mode: "PENALTY",
          status: "COMPLETED",
          goalsFor: rewards.goals,
          goalsAgainst: rewards.misses,
          questionsTotal: verifiedLog.length,
          correctCount: rewards.goals,
          coinsEarned: rewards.coins,
          xpEarned: rewards.xp,
          fansEarned: rewards.fans,
          staminaSpent: STAMINA_COST,
          answerLog: verifiedLog as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      const updatedClub = await tx.club.update({
        where: { id: club.id },
        data: {
          coins: { increment: rewards.coins },
          fans: { increment: rewards.fans },
          // Never let stamina fall below zero.
          stamina: Math.max(0, club.stamina - STAMINA_COST),
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: rewards.xp },
          weeklyXp: { increment: rewards.xp },
        },
      });

      return {
        coins: updatedClub.coins,
        fans: updatedClub.fans,
        stamina: updatedClub.stamina,
        maxStamina: updatedClub.maxStamina,
        xp: updatedUser.xp,
        managerLevel: updatedUser.managerLevel,
      };
    });

    revalidatePath("/club");

    return { ok: true, rewards, balances };
  } catch (err) {
    console.error("resolveMatch failed", err);
    return {
      ok: false,
      error: "Could not save results. Please try again.",
    };
  }
}
