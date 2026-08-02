import "server-only";

import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { addTehranDayKeys } from "@/lib/mystery/jobs";
import { ensureStarPathPuzzleForDate } from "./puzzle";

type Db = PrismaClient | Prisma.TransactionClient;

/** Default horizon: today (Tehran) + next 6 days. */
export const STAR_PATH_SCHEDULE_DAYS = 7;

export type StarPathScheduleStats = {
  skipped: string[];
  created: { dateKey: string; targetPlayerId: string }[];
  days: number;
  todayKey: string;
};

/**
 * Pre-create Star Path GotD rows for a Tehran day window.
 * Never overwrites an existing puzzle (Live-Ops /admin/star-path wins).
 */
export async function ensureStarPathSchedule(
  db: Db,
  options?: {
    days?: number;
    now?: Date;
  },
): Promise<StarPathScheduleStats> {
  const days = Math.min(
    31,
    Math.max(1, Math.floor(options?.days ?? STAR_PATH_SCHEDULE_DAYS)),
  );
  const now = options?.now ?? new Date();
  const todayKey = tehranDayKey(now);

  const skipped: string[] = [];
  const created: { dateKey: string; targetPlayerId: string }[] = [];

  for (let i = 0; i < days; i++) {
    const dateKey = addTehranDayKeys(todayKey, i);
    const { puzzle, created: didCreate } = await ensureStarPathPuzzleForDate(
      db,
      dateKey,
    );
    if (didCreate) {
      created.push({
        dateKey: puzzle.dateKey,
        targetPlayerId: puzzle.targetPlayerId,
      });
    } else {
      skipped.push(dateKey);
    }
  }

  return { skipped, created, days, todayKey };
}
