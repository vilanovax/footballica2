"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { evaluateKick, type KickSubmission } from "@/lib/quiz/scoring";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import { calculateLevel, type LevelInfo } from "@/lib/game/economy";
import { getGameConfig } from "@/lib/game/gameConfig";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { computeStreakUpdate } from "@/lib/game/streak";
import {
  SURVIVAL_LIVES,
  SURVIVAL_STAMINA_COST,
  bestComboFromResults,
  computeSurvivalRewards,
  type SurvivalEndReason,
  type SurvivalRewardBreakdown,
} from "@/lib/game/survival";

class SurvivalError extends Error {}

export type SettleSurvivalResult =
  | {
      ok: true;
      rewards: SurvivalRewardBreakdown;
      isNewRecord: boolean;
      previousRecord: number;
      balances: {
        coins: number;
        fans: number;
        stamina: number;
        maxStamina: number;
        xp: number;
        managerLevel: number;
      };
      level: LevelInfo;
      levelUp: { from: number; to: number; coinReward: number } | null;
      streak: {
        dailyStreak: number;
        longestDailyStreak: number;
        extended: boolean;
        isNewDay: boolean;
      };
      category: {
        id: string;
        nameEn: string;
        nameFa: string;
        icon: string | null;
      };
    }
  | { ok: false; error: string };

/**
 * Authoritative Survival settle — never mixes into resolveMatch.
 * Re-derives correctness from the DB question bank; client score is ignored.
 */
export async function settleSurvival(input: {
  categoryId: string;
  submissions: KickSubmission[];
  endReason: SurvivalEndReason;
}): Promise<SettleSurvivalResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "not_authenticated" };
    const { user, club: clubSnap } = pair;

    const categoryId =
      typeof input.categoryId === "string" ? input.categoryId.trim() : "";
    if (!categoryId) return { ok: false, error: "invalid_category" };

    const endReason: SurvivalEndReason =
      input.endReason === "cleared" ? "cleared" : "eliminated";

    const submissions = Array.isArray(input.submissions)
      ? input.submissions
      : [];
    if (submissions.length === 0) {
      return { ok: false, error: "empty_run" };
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true, nameEn: true, nameFa: true, icon: true },
    });
    if (!category) return { ok: false, error: "category_not_found" };

    const ids = submissions.map((s) => s.questionId);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length !== ids.length) {
      return { ok: false, error: "duplicate_questions" };
    }

    const rows = await prisma.question.findMany({
      where: {
        id: { in: uniqueIds },
        categoryId,
        status: "PUBLISHED",
      },
    });
    if (rows.length !== uniqueIds.length) {
      return { ok: false, error: "unknown_questions" };
    }

    const byId = new Map(rows.map((r) => [r.id, dbQuestionToQuiz(r)]));
    const correctFlags: boolean[] = [];
    const answerLog: {
      questionId: string;
      selectedIndex: number | null;
      correctIndex: number;
      result: "goal" | "miss";
      msRemaining: number;
    }[] = [];

    for (const sub of submissions) {
      const q = byId.get(sub.questionId);
      if (!q) return { ok: false, error: "unknown_questions" };
      const evaluation = evaluateKick(q, sub.selectedIndex);
      correctFlags.push(evaluation.isCorrect);
      answerLog.push({
        questionId: sub.questionId,
        selectedIndex: sub.selectedIndex,
        correctIndex: evaluation.correctIndex,
        result: evaluation.result,
        msRemaining: Math.max(
          0,
          Math.min(15_000, Math.round(sub.msRemaining) || 0),
        ),
      });
    }

    const score = correctFlags.filter(Boolean).length;
    const misses = correctFlags.filter((c) => !c).length;
    const bestCombo = bestComboFromResults(correctFlags);

    // Cleared runs must not have burned all lives via misses.
    if (endReason === "cleared" && misses >= SURVIVAL_LIVES) {
      return { ok: false, error: "invalid_end_reason" };
    }

    const rewards = computeSurvivalRewards({ score, bestCombo, endReason });
    const config = await getGameConfig();

    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.findUniqueOrThrow({
        where: { id: clubSnap.id },
        include: { user: true },
      });

      const regen = computeStaminaRegen(
        {
          stamina: club.stamina,
          maxStamina: club.maxStamina,
          lastStaminaUpdate: club.lastStaminaUpdate,
        },
        new Date(),
      );
      if (regen.stamina < SURVIVAL_STAMINA_COST) {
        throw new SurvivalError("not_enough_stamina");
      }

      const streak = computeStreakUpdate(
        {
          dailyStreak: club.dailyStreak,
          longestDailyStreak: club.longestDailyStreak,
          lastPlayedDate: club.lastPlayedDate,
        },
        new Date(),
      );

      const prevXp = club.user.xp;
      const oldLevel = calculateLevel(prevXp).level;
      const nextXp = prevXp + rewards.xp;
      const levelInfo = calculateLevel(nextXp);
      const leveledUp = levelInfo.level > oldLevel;
      const levelUpCoins = leveledUp
        ? (levelInfo.level - oldLevel) * config.rewards.levelUpCoins
        : 0;

      const existing = await tx.categoryRecord.findUnique({
        where: {
          clubId_categoryId: { clubId: club.id, categoryId },
        },
      });
      const previousRecord = existing?.maxSurvivalScore ?? 0;
      const isNewRecord = rewards.score > previousRecord;

      await tx.categoryRecord.upsert({
        where: {
          clubId_categoryId: { clubId: club.id, categoryId },
        },
        create: {
          clubId: club.id,
          categoryId,
          maxSurvivalScore: rewards.score,
          matchesPlayed: 1,
        },
        update: {
          maxSurvivalScore: isNewRecord ? rewards.score : previousRecord,
          matchesPlayed: { increment: 1 },
        },
      });

      await tx.match.create({
        data: {
          userId: user.id,
          clubId: club.id,
          mode: "SURVIVAL",
          status: "COMPLETED",
          categoryId,
          goalsFor: rewards.score,
          goalsAgainst: misses,
          questionsTotal: submissions.length,
          correctCount: rewards.score,
          coinsEarned: rewards.coins + levelUpCoins,
          xpEarned: rewards.xp,
          fansEarned: rewards.fans,
          staminaSpent: SURVIVAL_STAMINA_COST,
          bestCombo: rewards.bestCombo,
          usedHelp: false,
          answerLog: answerLog as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      const updatedClub = await tx.club.update({
        where: { id: club.id },
        data: {
          coins: { increment: rewards.coins + levelUpCoins },
          fans: { increment: rewards.fans },
          stamina: regen.stamina - SURVIVAL_STAMINA_COST,
          lastStaminaUpdate: regen.lastStaminaUpdate,
          matchesPlayed: { increment: 1 },
          goalsTotal: { increment: rewards.score },
          highestCombo: Math.max(club.highestCombo, rewards.bestCombo),
          dailyStreak: streak.dailyStreak,
          longestDailyStreak: streak.longestDailyStreak,
          lastPlayedDate: streak.lastPlayedDate,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          xp: nextXp,
          managerLevel: levelInfo.level,
          weeklyXp: { increment: Math.max(1, Math.floor(rewards.score / 3)) },
        },
      });

      return {
        rewards,
        isNewRecord,
        previousRecord,
        balances: {
          coins: updatedClub.coins,
          fans: updatedClub.fans,
          stamina: updatedClub.stamina,
          maxStamina: updatedClub.maxStamina,
          xp: nextXp,
          managerLevel: levelInfo.level,
        },
        level: levelInfo,
        levelUp: leveledUp
          ? {
              from: oldLevel,
              to: levelInfo.level,
              coinReward: levelUpCoins,
            }
          : null,
        streak: {
          dailyStreak: streak.dailyStreak,
          longestDailyStreak: streak.longestDailyStreak,
          extended: streak.extended,
          isNewDay: streak.isNewDay,
        },
      };
    });

    revalidatePath("/play");
    revalidatePath("/club");
    revalidatePath("/profile");
    revalidatePath("/leaderboard");

    return {
      ok: true,
      ...result,
      category,
    };
  } catch (err) {
    if (err instanceof SurvivalError) {
      return { ok: false, error: err.message };
    }
    console.error("[settleSurvival]", err);
    return { ok: false, error: "settle_failed" };
  }
}
