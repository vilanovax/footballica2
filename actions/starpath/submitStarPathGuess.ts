"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { getMysteryPlayer } from "@/lib/mystery/players";
import {
  ensureTodayStarPathPuzzle,
  maxCluesFromConfig,
  parsePathJson,
  parseStarPathGuesses,
  scoreForCluesRevealed,
  computeStarPathStreakUpdate,
  type StarPathGuessRecord,
} from "@/lib/starpath";
import { calculateLevel } from "@/lib/game/economy";
import { getGameConfig } from "@/lib/game/gameConfig";
import {
  calculateGotdWinRewards,
  type GotdRewardsPayload,
} from "@/lib/game/gotdRewards";
import type { DailyStarPathSnapshot } from "./getDailyStarPath";
import { getDailyStarPath } from "./getDailyStarPath";

export type SubmitStarPathGuessResult =
  | {
      ok: true;
      starPath: DailyStarPathSnapshot;
      rewards: GotdRewardsPayload | null;
      previousStreak: number;
    }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "unknown_player"
        | "already_done"
        | "duplicate_guess"
        | "unknown";
    };

/**
 * Submit a player guess for today's Star Path.
 * Wrong → reveal next club clue; at max clues → FAILED.
 * Correct → SOLVED + score (100/75/50/25) + GotD payout.
 */
export async function submitStarPathGuess(
  playerId: string,
): Promise<SubmitStarPathGuessResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "unauthenticated" };
    const { user, club } = pair;
    const config = await getGameConfig();

    const guessed = await getMysteryPlayer(playerId, prisma);
    if (!guessed) return { ok: false, error: "unknown_player" };

    const txResult = await prisma.$transaction(async (tx) => {
      const puzzle = await ensureTodayStarPathPuzzle(tx);
      const maxClues = maxCluesFromConfig(puzzle.config);
      const path = parsePathJson(puzzle.pathJson);
      const effectiveMax = Math.min(maxClues, Math.max(1, path.length));

      const attempt = await tx.dailyStarPathAttempt.upsert({
        where: {
          clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
        },
        create: {
          clubId: club.id,
          puzzleId: puzzle.id,
          cluesRevealed: 1,
        },
        update: {},
      });

      if (attempt.status !== "IN_PROGRESS") {
        return { kind: "already_done" as const };
      }

      const guesses = parseStarPathGuesses(attempt.guessesJson);
      if (guesses.some((g) => g.playerId === guessed.id)) {
        return { kind: "duplicate" as const };
      }

      const now = new Date();
      const correct = guessed.id === puzzle.targetPlayerId;
      const row: StarPathGuessRecord = {
        playerId: guessed.id,
        correct,
        at: now.toISOString(),
      };
      const nextGuesses = [...guesses, row];

      let status: "IN_PROGRESS" | "SOLVED" | "FAILED" = "IN_PROGRESS";
      let cluesRevealed = Math.max(1, attempt.cluesRevealed);
      let score = 0;
      let solvedAt: Date | null = null;
      let rewards: GotdRewardsPayload | null = null;
      let previousStreak = 0;
      let rewardJson: Prisma.InputJsonValue | undefined;
      let shareCode: string | null = attempt.shareCode;

      if (correct) {
        status = "SOLVED";
        solvedAt = now;
        score = scoreForCluesRevealed(cluesRevealed);
        shareCode = `⭐${score}`;
        const upd = computeStarPathStreakUpdate(
          {
            starPathStreak: club.starPathStreak,
            longestStarPathStreak: club.longestStarPathStreak,
            lastStarPathDate: club.lastStarPathDate,
          },
          now,
        );
        const perfect = score === 100;
        rewards = calculateGotdWinRewards({
          gotd: config.gotd,
          kind: "starPath",
          streakDays: upd.starPathStreak,
          perfect,
          score,
        });
        rewardJson = rewards as unknown as Prisma.InputJsonValue;

        const totalCoins = rewards.coinsEarned;
        const totalXp = rewards.xpEarned;
        const levelInfo = calculateLevel(user.xp + totalXp);

        await tx.club.update({
          where: { id: club.id },
          data: {
            starPathStreak: upd.starPathStreak,
            longestStarPathStreak: upd.longestStarPathStreak,
            lastStarPathDate: upd.lastStarPathDate,
            ...(upd.isNewDay ? { starPathSolves: { increment: 1 } } : {}),
            ...(totalCoins > 0 ? { coins: { increment: totalCoins } } : {}),
          },
        });

        if (totalXp > 0) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              xp: { increment: totalXp },
              weeklyXp: { increment: totalXp },
              managerLevel: levelInfo.level,
            },
          });
        }
      } else if (cluesRevealed >= effectiveMax) {
        status = "FAILED";
        score = 0;
        previousStreak = club.starPathStreak;
        shareCode = "⭐0";
        await tx.club.update({
          where: { id: club.id },
          data: { starPathStreak: 0 },
        });
      } else {
        cluesRevealed += 1;
      }

      await tx.dailyStarPathAttempt.update({
        where: { id: attempt.id },
        data: {
          status,
          cluesRevealed,
          score,
          guessesJson: nextGuesses as unknown as Prisma.InputJsonValue,
          shareCode,
          solvedAt,
          ...(rewardJson !== undefined ? { rewardJson } : {}),
        },
      });

      return {
        kind: "ok" as const,
        rewards,
        previousStreak,
      };
    });

    if (txResult.kind === "already_done") {
      return { ok: false, error: "already_done" };
    }
    if (txResult.kind === "duplicate") {
      return { ok: false, error: "duplicate_guess" };
    }

    const snap = await getDailyStarPath();
    if (!snap.ok) return { ok: false, error: "unknown" };

    revalidatePath("/play");
    revalidatePath("/play/star-path");

    return {
      ok: true,
      starPath: snap.starPath,
      rewards: txResult.rewards,
      previousStreak: txResult.previousStreak,
    };
  } catch (err) {
    console.error("[submitStarPathGuess]", err);
    return { ok: false, error: "unknown" };
  }
}
