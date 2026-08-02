import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import {
  ensureFootballPlayerCatalog,
  pickAutoTargetSlug,
} from "@/lib/mystery/players";
import { pickSlugForDateKey } from "@/lib/mystery/seedCatalog";
import { buildStarPathSteps } from "./path";
import { STAR_PATH_MAX_CLUES } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Prefer active players with enough career clubs for a meaningful path.
 * Falls back to any active catalog slug (path may be short).
 */
async function pickStarPathTargetSlug(
  dateKey: string,
  db: Db,
): Promise<string> {
  await ensureFootballPlayerCatalog(db);
  const rows = await db.footballPlayer.findMany({
    where: { isActive: true },
    select: { slug: true, club: true, pastClubs: true },
    take: 400,
  });

  const eligible = rows.filter((r) => buildStarPathSteps(r).length >= 2);
  const pool = eligible.length > 0 ? eligible : rows;
  if (pool.length === 0) {
    return pickAutoTargetSlug(dateKey, db);
  }
  return pickSlugForDateKey(
    dateKey,
    pool.map((r) => r.slug),
  );
}

/**
 * Ensure a Star Path puzzle exists for a Tehran `dateKey`.
 * Never overwrites an existing row (admin / cron wins).
 */
export async function ensureStarPathPuzzleForDate(db: Db, dateKey: string) {
  const existing = await db.dailyStarPathPuzzle.findUnique({
    where: { dateKey },
  });
  if (existing) return { puzzle: existing, created: false as const };

  const targetPlayerId = await pickStarPathTargetSlug(dateKey, db);
  const player = await db.footballPlayer.findUniqueOrThrow({
    where: { slug: targetPlayerId },
    select: { club: true, pastClubs: true },
  });
  const path = buildStarPathSteps(player);

  const puzzle = await db.dailyStarPathPuzzle.create({
    data: {
      dateKey,
      targetPlayerId,
      pathJson: path,
      config: { maxClues: STAR_PATH_MAX_CLUES },
    },
  });
  return { puzzle, created: true as const };
}

export async function ensureTodayStarPathPuzzle(
  db: Db,
  now: Date = new Date(),
) {
  const { puzzle } = await ensureStarPathPuzzleForDate(db, tehranDayKey(now));
  return puzzle;
}

export function maxCluesFromConfig(config: Prisma.JsonValue | null): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const n = (config as { maxClues?: unknown }).maxClues;
    if (typeof n === "number" && n >= 2 && n <= 8) return Math.floor(n);
  }
  return STAR_PATH_MAX_CLUES;
}
