"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { getGameConfig } from "@/lib/game/gameConfig";
import { isLiveModeEnabledInGotd } from "@/lib/game/liveModes";
import { calculateLevel } from "@/lib/game/economy";
import {
  calculateGotdWinRewards,
  type GotdRewardsPayload,
} from "@/lib/game/gotdRewards";
import { buildMemoryBoard } from "@/lib/duel/memoryBoard";
import { gradeMemoryAttempt } from "@/lib/duel/memoryGrade";
import type { MemoryAttemptSubmission } from "@/lib/duel/memoryTypes";
import {
  computeMemoryStreakUpdate,
  ensureTodayMemoryPuzzle,
} from "@/lib/memorygotd";
import type { DailyMemorySnapshot } from "./getDailyMemory";
import { getDailyMemory } from "./getDailyMemory";

export type SubmitMemoryGotdResult =
  | {
      ok: true;
      memory: DailyMemorySnapshot;
      rewards: GotdRewardsPayload | null;
      previousStreak: number;
    }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "disabled"
        | "already_done"
        | "unknown";
    };

/**
 * Single-shot Memory GotD settle.
 * SOLVED if pairsFound === pairCount, else FAILED. Pays GotD memory rewards on win.
 */
export async function submitMemoryGotd(
  attempt: MemoryAttemptSubmission,
): Promise<SubmitMemoryGotdResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "unauthenticated" };
    const { user, club } = pair;
    const config = await getGameConfig();

    if (!isLiveModeEnabledInGotd("memory", config)) {
      return { ok: false, error: "disabled" };
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const puzzle = await ensureTodayMemoryPuzzle(tx, config);

      const row = await tx.dailyMemoryAttempt.upsert({
        where: {
          clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
        },
        create: {
          clubId: club.id,
          puzzleId: puzzle.id,
        },
        update: {},
      });

      if (row.status !== "IN_PROGRESS") {
        return { kind: "already_done" as const };
      }

      const board = await buildMemoryBoard({
        pairCount: puzzle.pairCount,
        seed: puzzle.seed,
      });
      const log = gradeMemoryAttempt(
        board,
        attempt ?? { flips: [], matches: [], durationMs: 0 },
      );

      const now = new Date();
      const solved = log.pairsFound === log.pairCount;
      const status = solved ? ("SOLVED" as const) : ("FAILED" as const);
      let rewards: GotdRewardsPayload | null = null;
      let previousStreak = 0;
      let rewardJson: Prisma.InputJsonValue | undefined;
      let shareCode: string | null = null;
      let solvedAt: Date | null = null;

      if (solved) {
        solvedAt = now;
        shareCode = `🧠${log.pairsFound}/${log.pairCount}`;
        const upd = computeMemoryStreakUpdate(
          {
            memoryStreak: club.memoryStreak,
            longestMemoryStreak: club.longestMemoryStreak,
            lastMemoryDate: club.lastMemoryDate,
          },
          now,
        );
        // Clearing the full board is the only win path → perfect.
        rewards = calculateGotdWinRewards({
          gotd: config.gotd,
          kind: "memory",
          streakDays: upd.memoryStreak,
          perfect: true,
        });
        rewardJson = rewards as unknown as Prisma.InputJsonValue;

        const totalCoins = rewards.coinsEarned;
        const totalXp = rewards.xpEarned;
        const levelInfo = calculateLevel(user.xp + totalXp);

        await tx.club.update({
          where: { id: club.id },
          data: {
            memoryStreak: upd.memoryStreak,
            longestMemoryStreak: upd.longestMemoryStreak,
            lastMemoryDate: upd.lastMemoryDate,
            ...(upd.isNewDay ? { memorySolves: { increment: 1 } } : {}),
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
      } else {
        previousStreak = club.memoryStreak;
        shareCode = `🧠${log.pairsFound}/${log.pairCount}`;
        await tx.club.update({
          where: { id: club.id },
          data: { memoryStreak: 0 },
        });
      }

      await tx.dailyMemoryAttempt.update({
        where: { id: row.id },
        data: {
          status,
          pairsFound: log.pairsFound,
          logJson: log as unknown as Prisma.InputJsonValue,
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

    const snap = await getDailyMemory();
    if (!snap.ok) return { ok: false, error: "unknown" };

    revalidatePath("/play");
    revalidatePath("/play/memory");

    return {
      ok: true,
      memory: snap.memory,
      rewards: txResult.rewards,
      previousStreak: txResult.previousStreak,
    };
  } catch (err) {
    console.error("[submitMemoryGotd]", err);
    return { ok: false, error: "unknown" };
  }
}
