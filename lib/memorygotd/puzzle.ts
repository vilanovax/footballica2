import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import {
  DEFAULT_GAME_CONFIG,
  type GameConfig,
} from "@/lib/game/economy";

type Db = PrismaClient | Prisma.TransactionClient;

export type MemoryPuzzleConfig = {
  turnMs: number;
  revealMs: number;
};

/**
 * Ensure a Memory GotD puzzle exists for a Tehran `dateKey`.
 * Seed is stable (`memory-${dateKey}`); never overwrites an existing row.
 */
export async function ensureMemoryPuzzleForDate(
  db: Db,
  dateKey: string,
  config: GameConfig = DEFAULT_GAME_CONFIG,
) {
  const existing = await db.dailyMemoryPuzzle.findUnique({
    where: { dateKey },
  });
  if (existing) return { puzzle: existing, created: false as const };

  const pairCount = Math.max(
    2,
    Math.min(8, Math.round(config.duel.memoryPairs)),
  );
  const seed = `memory-${dateKey}`;
  const puzzleConfig: MemoryPuzzleConfig = {
    turnMs: config.duel.memoryTurnMs,
    revealMs: config.duel.memoryRevealMs,
  };

  const puzzle = await db.dailyMemoryPuzzle.create({
    data: {
      dateKey,
      seed,
      pairCount,
      config: puzzleConfig,
    },
  });
  return { puzzle, created: true as const };
}

/**
 * Ensure today's Tehran Memory GotD puzzle exists.
 */
export async function ensureTodayMemoryPuzzle(
  db: Db,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  now: Date = new Date(),
) {
  const { puzzle } = await ensureMemoryPuzzleForDate(
    db,
    tehranDayKey(now),
    config,
  );
  return puzzle;
}

export function memoryTurnMsFromConfig(
  config: Prisma.JsonValue | null,
  fallback: number = DEFAULT_GAME_CONFIG.duel.memoryTurnMs,
): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const n = (config as { turnMs?: unknown }).turnMs;
    if (typeof n === "number" && n >= 5_000 && n <= 120_000) {
      return Math.floor(n);
    }
  }
  return fallback;
}

export function memoryRevealMsFromConfig(
  config: Prisma.JsonValue | null,
  fallback: number = DEFAULT_GAME_CONFIG.duel.memoryRevealMs,
): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const n = (config as { revealMs?: unknown }).revealMs;
    if (typeof n === "number" && n >= 500 && n <= 5_000) {
      return Math.floor(n);
    }
  }
  return fallback;
}
