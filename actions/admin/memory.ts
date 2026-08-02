"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { getGameConfig } from "@/lib/game/gameConfig";
import { liveModesFromConfig, type LiveModePlacement } from "@/lib/game/liveModes";
import type { GameConfig } from "@/lib/game/economy";

export type AdminMemoryPuzzleRow = {
  id: string;
  dateKey: string;
  pairCount: number;
  attemptCount: number;
  solvedCount: number;
  createdAt: string;
  isToday: boolean;
};

export type AdminMemorySnapshot = {
  todayKey: string;
  /** Active players with a valid ISO α-2 nationality code (memory board pool). */
  activePlayerPoolCount: number;
  /** Distinct valid nationality codes among that pool. */
  distinctNationCount: number;
  duelKnobs: {
    memoryPairs: number;
    memoryTurnMs: number;
    memoryRevealMs: number;
  };
  placement: LiveModePlacement;
  /** MEMORY DuelRounds created in the last 7 days. */
  recentMemoryDuelRounds: number;
  puzzles: AdminMemoryPuzzleRow[];
  config: GameConfig;
};

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function getAdminMemorySnapshot(): Promise<AdminMemorySnapshot> {
  const todayKey = tehranDayKey();
  const empty: AdminMemorySnapshot = {
    todayKey,
    activePlayerPoolCount: 0,
    distinctNationCount: 0,
    duelKnobs: { memoryPairs: 8, memoryTurnMs: 20_000, memoryRevealMs: 2_000 },
    placement: { duel: true, gotd: false },
    recentMemoryDuelRounds: 0,
    puzzles: [],
    config: await getGameConfig(),
  };

  if (!(await assertAdmin())) return empty;

  const config = await getGameConfig();
  const placement = liveModesFromConfig(config).memory;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [pool, recentMemoryDuelRounds, puzzles, solvedGroups] =
    await Promise.all([
      prisma.footballPlayer.findMany({
        where: { isActive: true },
        select: { nationalityCode: true },
        take: 2000,
      }),
      prisma.duelRound.count({
        where: {
          roundType: "MEMORY",
          createdAt: { gte: weekAgo },
        },
      }),
      prisma.dailyMemoryPuzzle.findMany({
        orderBy: { dateKey: "desc" },
        take: 60,
        include: { _count: { select: { attempts: true } } },
      }),
      prisma.dailyMemoryAttempt.groupBy({
        by: ["puzzleId"],
        where: { status: "SOLVED" },
        _count: { _all: true },
      }),
    ]);

  const nations = new Set<string>();
  let activePlayerPoolCount = 0;
  for (const p of pool) {
    const code = (p.nationalityCode || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) continue;
    activePlayerPoolCount += 1;
    nations.add(code);
  }

  const solvedMap = new Map(
    solvedGroups.map((g) => [g.puzzleId, g._count._all]),
  );

  return {
    todayKey,
    activePlayerPoolCount,
    distinctNationCount: nations.size,
    duelKnobs: {
      memoryPairs: config.duel.memoryPairs,
      memoryTurnMs: config.duel.memoryTurnMs,
      memoryRevealMs: config.duel.memoryRevealMs,
    },
    placement,
    recentMemoryDuelRounds,
    puzzles: puzzles.map((p) => ({
      id: p.id,
      dateKey: p.dateKey,
      pairCount: p.pairCount,
      attemptCount: p._count.attempts,
      solvedCount: solvedMap.get(p.id) ?? 0,
      createdAt: p.createdAt.toISOString(),
      isToday: p.dateKey === todayKey,
    })),
    config,
  };
}
