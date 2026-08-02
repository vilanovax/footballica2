import "server-only";

import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import {
  DEFAULT_GAME_CONFIG,
  type GameConfig,
} from "@/lib/game/economy";
import { addTehranDayKeys } from "@/lib/mystery/jobs";
import { ensureMemoryPuzzleForDate } from "./puzzle";

type Db = PrismaClient | Prisma.TransactionClient;

/** Default horizon: today (Tehran) + next 6 days. */
export const MEMORY_SCHEDULE_DAYS = 7;

export type MemoryScheduleStats = {
  skipped: string[];
  created: { dateKey: string; seed: string; pairCount: number }[];
  days: number;
  todayKey: string;
};

/**
 * Pre-create Memory GotD rows for a Tehran day window.
 * Never overwrites an existing puzzle (admin / Live-Ops wins).
 */
export async function ensureMemorySchedule(
  db: Db,
  options?: {
    days?: number;
    now?: Date;
    config?: GameConfig;
  },
): Promise<MemoryScheduleStats> {
  const days = Math.min(
    31,
    Math.max(1, Math.floor(options?.days ?? MEMORY_SCHEDULE_DAYS)),
  );
  const now = options?.now ?? new Date();
  const config = options?.config ?? DEFAULT_GAME_CONFIG;
  const todayKey = tehranDayKey(now);

  const skipped: string[] = [];
  const created: { dateKey: string; seed: string; pairCount: number }[] = [];

  for (let i = 0; i < days; i++) {
    const dateKey = addTehranDayKeys(todayKey, i);
    const { puzzle, created: didCreate } = await ensureMemoryPuzzleForDate(
      db,
      dateKey,
      config,
    );
    if (didCreate) {
      created.push({
        dateKey: puzzle.dateKey,
        seed: puzzle.seed,
        pairCount: puzzle.pairCount,
      });
    } else {
      skipped.push(dateKey);
    }
  }

  return { skipped, created, days, todayKey };
}
