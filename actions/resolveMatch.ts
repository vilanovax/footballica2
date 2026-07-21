"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateDummyClub } from "@/lib/dev/dummyClub";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import { verifyKickLog, type KickSubmission } from "@/lib/quiz/scoring";
import {
  computeMatchRewards,
  calculateLevel,
  type RewardBreakdown,
  type LevelInfo,
} from "@/lib/game/economy";
import { getGameConfig } from "@/lib/game/gameConfig";
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
      rewards: RewardBreakdown;
      balances: {
        coins: number;
        fans: number;
        stamina: number;
        maxStamina: number;
        xp: number;
        managerLevel: number;
        tutorialStep: number;
        // Upgrade levels — let the result screen compute the next milestone.
        stadiumLevel: number;
        medicalLevel: number;
        trainingGroundLevel: number;
      };
      /** Level + progress derived from the new lifetime XP total. */
      level: LevelInfo;
      /** Present only when this match pushed the player to a new level. */
      levelUp: { from: number; to: number; coinReward: number } | null;
      /** Config coins-per-win, so the UI can express milestones as "wins away". */
      coinsPerWin: number;
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

  // Effective (Live-Ops) economy config — DB singleton merged over defaults.
  const config = await getGameConfig();
  const baseRewards = computeMatchRewards(verifiedLog, config);

  try {
    const result = await prisma.$transaction(async (tx) => {
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
      let finalRewards: RewardBreakdown;
      if (isTutorial) {
        finalRewards = {
          ...baseRewards,
          coins: TUTORIAL_REWARD.coins,
          xp: TUTORIAL_REWARD.xp,
          fans: TUTORIAL_REWARD.fans,
          comboFactor: 1,
          breakdown: {
            xpFromGoals: TUTORIAL_REWARD.xp,
            xpWinBonus: 0,
            coinsWin: TUTORIAL_REWARD.coins,
            coinsPerfectBonus: 0,
            comboXpBonus: 0,
            comboCoinBonus: 0,
          },
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

      // Leveling: derive level from lifetime XP (authoritative), detect a
      // level-up, and grant its perks — a coin bonus per level gained + a full
      // stamina refill. `calculateLevel` is the single source of truth, so a
      // stale stored managerLevel can never desync the reward.
      const oldLevel = calculateLevel(user.xp).level;
      const newXp = user.xp + finalRewards.xp;
      const levelInfo = calculateLevel(newXp);
      const leveledUp = levelInfo.level > oldLevel;
      const levelUpCoins = leveledUp
        ? (levelInfo.level - oldLevel) * config.rewards.levelUpCoins
        : 0;

      // A level-up refills stamina to full (and restarts the regen clock);
      // otherwise carry the post-match spend + regen anchor.
      const finalStamina = leveledUp ? club.maxStamina : spentStamina;
      const finalStaminaAnchor = leveledUp ? new Date() : staminaAnchor;

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
          // Match coins + any level-up bonus.
          coins: { increment: finalRewards.coins + levelUpCoins },
          fans: { increment: finalRewards.fans },
          // Absolute set: regen already accounted for above (or refilled on level-up).
          stamina: finalStamina,
          lastStaminaUpdate: finalStaminaAnchor,
          tutorialStep: nextTutorialStep,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: finalRewards.xp },
          weeklyXp: { increment: finalRewards.xp },
          managerLevel: levelInfo.level,
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
          stadiumLevel: updatedClub.stadiumLevel,
          medicalLevel: updatedClub.medicalLevel,
          trainingGroundLevel: updatedClub.trainingGroundLevel,
        },
        level: levelInfo,
        levelUp: leveledUp
          ? { from: oldLevel, to: levelInfo.level, coinReward: levelUpCoins }
          : null,
        coinsPerWin: config.rewards.coinsPerWin,
      };
    });

    revalidatePath("/club");

    return { ok: true, ...result };
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
