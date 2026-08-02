"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { getGameConfig } from "@/lib/game/gameConfig";
import { isLiveModeEnabledInGotd } from "@/lib/game/liveModes";
import { buildMemoryBoard } from "@/lib/duel/memoryBoard";
import type { MemoryBoardJson } from "@/lib/duel/memoryTypes";
import {
  ensureTodayMemoryPuzzle,
  memoryRevealMsFromConfig,
  memoryTurnMsFromConfig,
} from "@/lib/memorygotd";

export type MemoryGotdAttemptStatus = "IN_PROGRESS" | "SOLVED" | "FAILED";

export type DailyMemorySnapshot = {
  dateKey: string;
  pairCount: number;
  turnMs: number;
  revealMs: number;
  status: MemoryGotdAttemptStatus;
  pairsFound: number;
  board: MemoryBoardJson;
  shareCode: string | null;
  memoryStreak: number;
  longestMemoryStreak: number;
};

export type GetDailyMemoryResult =
  | { ok: true; memory: DailyMemorySnapshot }
  | {
      ok: false;
      error: "unauthenticated" | "no_club" | "disabled" | "unknown";
    };

export async function getDailyMemory(): Promise<GetDailyMemoryResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "unauthenticated" };
    const { club } = pair;

    const config = await getGameConfig();
    if (!isLiveModeEnabledInGotd("memory", config)) {
      return { ok: false, error: "disabled" };
    }

    const puzzle = await ensureTodayMemoryPuzzle(prisma, config);
    const turnMs = memoryTurnMsFromConfig(
      puzzle.config,
      config.duel.memoryTurnMs,
    );
    const revealMs = memoryRevealMsFromConfig(
      puzzle.config,
      config.duel.memoryRevealMs,
    );

    let attempt = await prisma.dailyMemoryAttempt.findUnique({
      where: {
        clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
      },
    });

    if (!attempt) {
      attempt = await prisma.dailyMemoryAttempt.create({
        data: {
          clubId: club.id,
          puzzleId: puzzle.id,
        },
      });
    }

    const board = await buildMemoryBoard({
      pairCount: puzzle.pairCount,
      seed: puzzle.seed,
    });

    return {
      ok: true,
      memory: {
        dateKey: puzzle.dateKey,
        pairCount: puzzle.pairCount,
        turnMs,
        revealMs,
        status: attempt.status,
        pairsFound: attempt.pairsFound,
        board,
        shareCode: attempt.shareCode,
        memoryStreak: club.memoryStreak,
        longestMemoryStreak: club.longestMemoryStreak,
      },
    };
  } catch (err) {
    console.error("[getDailyMemory]", err);
    return { ok: false, error: "unknown" };
  }
}
