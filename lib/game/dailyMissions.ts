import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { tehranDayNumber } from "@/lib/game/streak";

type Db = typeof prisma | Prisma.TransactionClient;

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` in Asia/Tehran. */
export function tehranDayKey(date: Date = new Date()): string {
  return dayKeyFormatter.format(date);
}

/** Next Tehran midnight (approx via day ordinal) for schedule display. */
export function tehranDayWindow(date: Date = new Date()): {
  dayKey: string;
  startsAt: Date;
  endsAt: Date;
  batchIndex: number;
} {
  const dayKey = tehranDayKey(date);
  const dayNum = tehranDayNumber(date);
  const startsAt = new Date(dayNum * 86_400_000);
  const endsAt = new Date((dayNum + 1) * 86_400_000);
  return {
    dayKey,
    startsAt,
    endsAt,
    batchIndex: 10_000 + dayNum,
  };
}

const DAILY_TEMPLATE = [
  {
    titleEn: "Score 3 goals today",
    titleFa: "امروز ۳ گل بزن",
    objectiveType: "SCORE_GOALS" as const,
    targetValue: 3,
    rewardCoins: 15,
    rewardXp: 5,
    sortOrder: 0,
  },
  {
    titleEn: "Play 1 match today",
    titleFa: "امروز ۱ مسابقه بازی کن",
    objectiveType: "PLAY_MATCHES" as const,
    targetValue: 1,
    rewardCoins: 10,
    rewardXp: 5,
    sortOrder: 1,
  },
  {
    titleEn: "Win 1 match today",
    titleFa: "امروز ۱ برد بگیر",
    objectiveType: "WIN_MATCHES" as const,
    targetValue: 1,
    rewardCoins: 25,
    rewardXp: 10,
    sortOrder: 2,
  },
];

/**
 * Idempotently create today's DAILY batch (Tehran calendar) with 3 missions.
 */
export async function ensureTodayDailyBatch(db: Db = prisma, now = new Date()) {
  const { dayKey, startsAt, endsAt, batchIndex } = tehranDayWindow(now);

  const existing = await db.missionBatch.findUnique({
    where: { dayKey },
    include: { missions: { orderBy: { sortOrder: "asc" } } },
  });
  if (existing) return existing;

  try {
    return await db.missionBatch.create({
      data: {
        batchIndex,
        kind: "DAILY",
        dayKey,
        chestCoins: 80,
        chestXp: 25,
        isActive: true,
        startsAt,
        endsAt,
        missions: {
          create: DAILY_TEMPLATE.map((m) => ({ ...m })),
        },
      },
      include: { missions: { orderBy: { sortOrder: "asc" } } },
    });
  } catch {
    // Race: another request created it.
    const again = await db.missionBatch.findUnique({
      where: { dayKey },
      include: { missions: { orderBy: { sortOrder: "asc" } } },
    });
    if (!again) throw new Error("daily_batch_create_failed");
    return again;
  }
}
