import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { addTehranDayKeys } from "@/lib/mystery/jobs";
import { buildAutoGridAxes, loadGridPlayers } from "./puzzle";
import { GRID_MAX_MISTAKES } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

export const GRID_SCHEDULE_DAYS = 7;

export type GridScheduleStats = {
  skipped: string[];
  created: string[];
  days: number;
  todayKey: string;
};

/**
 * Pre-create Grid days for a Tehran window.
 * Never overwrites an existing puzzle (admin /admin/grid wins).
 */
export async function ensureGridSchedule(
  db: Db,
  options?: {
    days?: number;
    now?: Date;
    maxMistakes?: number;
  },
): Promise<GridScheduleStats> {
  const days = Math.min(
    31,
    Math.max(1, Math.floor(options?.days ?? GRID_SCHEDULE_DAYS)),
  );
  const now = options?.now ?? new Date();
  const maxMistakes = Math.min(
    20,
    Math.max(1, Math.round(options?.maxMistakes ?? GRID_MAX_MISTAKES)),
  );
  const todayKey = tehranDayKey(now);

  const players = await loadGridPlayers(db);

  const skipped: string[] = [];
  const created: string[] = [];

  for (let i = 0; i < days; i++) {
    const dateKey = addTehranDayKeys(todayKey, i);
    const existing = await db.dailyGridPuzzle.findUnique({
      where: { dateKey },
      select: { dateKey: true },
    });
    if (existing) {
      skipped.push(dateKey);
      continue;
    }

    const built = buildAutoGridAxes(players);
    if (!built) {
      // Skip unsolvable auto-build rather than publishing empty cells.
      skipped.push(dateKey);
      continue;
    }

    await db.dailyGridPuzzle.create({
      data: {
        dateKey,
        rowsJson: built.rows as unknown as Prisma.InputJsonValue,
        colsJson: built.cols as unknown as Prisma.InputJsonValue,
        config: { maxMistakes },
      },
    });
    created.push(dateKey);
  }

  return { skipped, created, days, todayKey };
}
