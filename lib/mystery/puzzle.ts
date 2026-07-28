import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { MYSTERY_MAX_GUESSES } from "./types";
import { pickAutoTargetSlug } from "./players";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Ensure today's Tehran puzzle row exists (idempotent upsert by dateKey).
 * Uses Live-Ops row if present; otherwise auto-picks an active FootballPlayer.
 */
export async function ensureTodayMysteryPuzzle(
  db: Db,
  now: Date = new Date(),
) {
  const dateKey = tehranDayKey(now);
  const existing = await db.dailyMysteryPuzzle.findUnique({
    where: { dateKey },
  });
  if (existing) return existing;

  const targetPlayerId = await pickAutoTargetSlug(dateKey, db);
  return db.dailyMysteryPuzzle.create({
    data: {
      dateKey,
      targetPlayerId,
      config: { maxGuesses: MYSTERY_MAX_GUESSES },
    },
  });
}

export function maxGuessesFromConfig(config: Prisma.JsonValue | null): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const n = (config as { maxGuesses?: unknown }).maxGuesses;
    if (typeof n === "number" && n >= 1 && n <= 12) return Math.floor(n);
  }
  return MYSTERY_MAX_GUESSES;
}
