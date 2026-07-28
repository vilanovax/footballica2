import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { pickAutoTargetSlug } from "./players";
import { MYSTERY_MAX_GUESSES } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

/** Default horizon: today (Tehran) + next 6 days. */
export const MYSTERY_SCHEDULE_DAYS = 7;

/**
 * Shift a Tehran `YYYY-MM-DD` by whole calendar days (noon +03:30 anchor).
 */
export function addTehranDayKeys(fromKey: string, offset: number): string {
  const base = new Date(`${fromKey}T12:00:00+03:30`);
  base.setTime(base.getTime() + offset * 86_400_000);
  return tehranDayKey(base);
}

export type MysteryScheduleStats = {
  /** Tehran day keys that already had a puzzle (admin or prior cron). */
  skipped: string[];
  /** Newly created auto-picked puzzles. */
  created: { dateKey: string; targetPlayerId: string }[];
  days: number;
  todayKey: string;
};

/**
 * Pre-create Game of the Day rows for a Tehran day window.
 *
 * - Never overwrites an existing puzzle (Live-Ops /admin/mystery wins).
 * - Missing days get a deterministic auto-pick (`pickAutoTargetSlug`).
 * - Safe to run on cron or opportunistically; idempotent.
 */
export async function ensureMysterySchedule(
  db: Db,
  options?: {
    /** Inclusive window length starting today Tehran (default 7). */
    days?: number;
    now?: Date;
    maxGuesses?: number;
  },
): Promise<MysteryScheduleStats> {
  const days = Math.min(
    31,
    Math.max(1, Math.floor(options?.days ?? MYSTERY_SCHEDULE_DAYS)),
  );
  const now = options?.now ?? new Date();
  const maxGuesses = Math.min(
    12,
    Math.max(1, Math.round(options?.maxGuesses ?? MYSTERY_MAX_GUESSES)),
  );
  const todayKey = tehranDayKey(now);

  const skipped: string[] = [];
  const created: { dateKey: string; targetPlayerId: string }[] = [];

  for (let i = 0; i < days; i++) {
    const dateKey = addTehranDayKeys(todayKey, i);
    const existing = await db.dailyMysteryPuzzle.findUnique({
      where: { dateKey },
      select: { dateKey: true },
    });
    if (existing) {
      skipped.push(dateKey);
      continue;
    }

    const targetPlayerId = await pickAutoTargetSlug(dateKey, db);
    await db.dailyMysteryPuzzle.create({
      data: {
        dateKey,
        targetPlayerId,
        config: { maxGuesses },
      },
    });
    created.push({ dateKey, targetPlayerId });
  }

  return { skipped, created, days, todayKey };
}
