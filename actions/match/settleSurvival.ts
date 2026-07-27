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
  bestComboFromResults,
  computeSurvivalRewards,
  survivalWeeklyXp,
  type SurvivalEndReason,
  type SurvivalRewardBreakdown,
} from "@/lib/game/survival";
import {
  applyBoosterMultipliers,
  type BoosterType,
} from "@/lib/boosters/boosters";
import {
  isChallengeTargetMet,
  isRecordChallengeLive,
} from "@/lib/game/recordChallenge";
import { isCategoryAllowedForChallenge } from "@/lib/game/challengeCategories";
import { evaluateAllMissionTracks } from "@/lib/game/missionEngine";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

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
      challenge: {
        id: string;
        conquered: boolean;
        badgeGranted: boolean;
        badgeSlug: string | null;
        badgeEmoji: string | null;
        targetScore: number;
        bestScore: number;
      } | null;
      missions: EvaluateMissionsResult;
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
  /** Premium RecordChallenge — requires prior unlock; run still costs 1 stamina. */
  challengeId?: string | null;
}): Promise<SettleSurvivalResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "not_authenticated" };
    const { user, club: clubSnap } = pair;

    const categoryId =
      typeof input.categoryId === "string" ? input.categoryId.trim() : "";
    if (!categoryId) return { ok: false, error: "invalid_category" };

    const challengeId =
      typeof input.challengeId === "string" && input.challengeId.trim()
        ? input.challengeId.trim()
        : null;

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
      select: {
        id: true,
        nameEn: true,
        nameFa: true,
        icon: true,
        challengeOnly: true,
      },
    });
    if (!category) return { ok: false, error: "category_not_found" };

    let challengeRow: {
      id: string;
      targetScore: number;
      rewardBadgeSlug: string | null;
      rewardBadgeEmoji: string | null;
    } | null = null;

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
            clubId: clubSnap.id,
            challengeId,
          },
        },
      });
      if (!access) return { ok: false, error: "challenge_locked" };
      challengeRow = {
        id: challenge.id,
        targetScore: challenge.targetScore,
        rewardBadgeSlug: challenge.rewardBadgeSlug,
        rewardBadgeEmoji: challenge.rewardBadgeEmoji,
      };
    } else if (category.challengeOnly) {
      return { ok: false, error: "category_not_found" };
    }

    // Keep first occurrence per questionId — client prefetch races used to
    // duplicate queue entries; hard-failing wiped legitimate runs.
    const seenSub = new Set<string>();
    const dedupedSubmissions = submissions.filter((s) => {
      const id = typeof s.questionId === "string" ? s.questionId : "";
      if (!id || seenSub.has(id)) return false;
      seenSub.add(id);
      return true;
    });
    if (dedupedSubmissions.length === 0) {
      return { ok: false, error: "empty_run" };
    }
    const uniqueIds = [...seenSub];

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

    for (const sub of dedupedSubmissions) {
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

    const config = await getGameConfig();
    const staminaCost = config.survival.staminaCost;
    const lives = config.survival.lives;

    // Cleared runs must not have burned all lives via misses.
    if (endReason === "cleared" && misses >= lives) {
      return { ok: false, error: "invalid_end_reason" };
    }

    const baseRewards = computeSurvivalRewards(
      { score, bestCombo, endReason },
      config,
    );

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
      if (regen.stamina < staminaCost) {
        throw new SurvivalError("not_enough_stamina");
      }

      // Newspaper Event multipliers — same stack as Penalty / Quick.
      const activeBoosters = await tx.activeBooster.findMany({
        where: { clubId: club.id, expiresAt: { gt: new Date() } },
        select: { type: true, multiplier: true },
      });
      const boosted = applyBoosterMultipliers(
        baseRewards,
        activeBoosters.map((b) => ({
          type: b.type as BoosterType,
          multiplier: b.multiplier,
        })),
      );
      const rewards: SurvivalRewardBreakdown = {
        ...boosted,
        boosterCoinBonus: Math.max(0, boosted.coins - baseRewards.coins),
        boosterFanBonus: Math.max(0, boosted.fans - baseRewards.fans),
      };

      const streak = computeStreakUpdate(
        {
          dailyStreak: club.dailyStreak,
          longestDailyStreak: club.longestDailyStreak,
          lastPlayedDate: club.lastPlayedDate,
        },
        new Date(),
      );

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

      const matchRow = await tx.match.create({
        data: {
          userId: user.id,
          clubId: club.id,
          mode: "SURVIVAL",
          status: "COMPLETED",
          categoryId,
          recordChallengeId: challengeRow?.id ?? null,
          goalsFor: rewards.score,
          goalsAgainst: misses,
          questionsTotal: dedupedSubmissions.length,
          correctCount: rewards.score,
          coinsEarned: rewards.coins,
          xpEarned: rewards.xp,
          fansEarned: rewards.fans,
          staminaSpent: staminaCost,
          bestCombo: rewards.bestCombo,
          usedHelp: false,
          answerLog: answerLog as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      const missionResult = await evaluateAllMissionTracks(
        club.id,
        {
          matchId: matchRow.id,
          goals: rewards.score,
          won: endReason === "cleared" || rewards.score > 0,
          perfect: endReason === "cleared",
          combo: rewards.bestCombo,
          isTutorial: false,
        },
        tx,
      );
      const missionCoins = missionResult.missionRewards.coins;
      const missionXp = missionResult.missionRewards.xp;

      const prevXp = club.user.xp;
      const oldLevel = calculateLevel(prevXp).level;
      const nextXp = prevXp + rewards.xp + missionXp;
      const levelInfo = calculateLevel(nextXp);
      const leveledUp = levelInfo.level > oldLevel;
      const levelUpCoins = leveledUp
        ? (levelInfo.level - oldLevel) * config.rewards.levelUpCoins
        : 0;

      if (levelUpCoins > 0 || missionCoins > 0 || missionXp > 0) {
        await tx.match.update({
          where: { id: matchRow.id },
          data: {
            coinsEarned: rewards.coins + levelUpCoins + missionCoins,
            xpEarned: rewards.xp + missionXp,
          },
        });
      }

      let challengeResult: {
        id: string;
        conquered: boolean;
        badgeGranted: boolean;
        badgeSlug: string | null;
        badgeEmoji: string | null;
        targetScore: number;
        bestScore: number;
      } | null = null;

      if (challengeRow) {
        const conquered = isChallengeTargetMet(
          rewards.score,
          challengeRow.targetScore,
        );
        const existingRun = await tx.clubChallengeRun.findUnique({
          where: {
            clubId_challengeId: {
              clubId: club.id,
              challengeId: challengeRow.id,
            },
          },
        });
        const bestScore = Math.max(
          existingRun?.bestScore ?? 0,
          rewards.score,
        );
        const alreadyConquered = Boolean(existingRun?.conqueredAt);
        const badgeSlug = challengeRow.rewardBadgeSlug;
        let badgeGranted = Boolean(existingRun?.badgeGranted);
        let justGrantedBadge = false;

        if (conquered && badgeSlug && !badgeGranted) {
          const owned = await tx.clubBadge.findUnique({
            where: {
              clubId_badgeSlug: { clubId: club.id, badgeSlug },
            },
          });
          if (!owned) {
            await tx.clubBadge.create({
              data: {
                clubId: club.id,
                badgeSlug,
                coinsAwarded: 0,
                xpAwarded: 0,
                sourceChallengeId: challengeRow.id,
              },
            });
            justGrantedBadge = true;
          }
          badgeGranted = true;
        }

        const run = await tx.clubChallengeRun.upsert({
          where: {
            clubId_challengeId: {
              clubId: club.id,
              challengeId: challengeRow.id,
            },
          },
          create: {
            clubId: club.id,
            challengeId: challengeRow.id,
            bestScore: rewards.score,
            attempts: 1,
            conqueredAt: conquered ? new Date() : null,
            badgeGranted,
          },
          update: {
            bestScore,
            attempts: { increment: 1 },
            conqueredAt:
              conquered && !alreadyConquered
                ? new Date()
                : existingRun?.conqueredAt ?? undefined,
            badgeGranted: badgeGranted || undefined,
          },
        });

        challengeResult = {
          id: challengeRow.id,
          conquered: Boolean(run.conqueredAt) || conquered,
          /** True only when this settle newly granted the challenge badge. */
          badgeGranted: justGrantedBadge,
          badgeSlug,
          badgeEmoji: challengeRow.rewardBadgeEmoji,
          targetScore: challengeRow.targetScore,
          bestScore: run.bestScore,
        };
      }

      const finalStamina = leveledUp
        ? club.maxStamina
        : regen.stamina - staminaCost;
      const finalStaminaAnchor = leveledUp
        ? new Date()
        : regen.lastStaminaUpdate;

      const updatedClub = await tx.club.update({
        where: { id: club.id },
        data: {
          coins: {
            increment: rewards.coins + levelUpCoins + missionCoins,
          },
          fans: { increment: rewards.fans },
          stamina: finalStamina,
          lastStaminaUpdate: finalStaminaAnchor,
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
          weeklyXp: {
            increment:
              survivalWeeklyXp(rewards.score, config) + missionXp,
          },
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
        challenge: challengeResult,
        missions: missionResult,
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
