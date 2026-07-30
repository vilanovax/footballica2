"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { MYSTERY_MAX_GUESSES } from "@/lib/mystery";
import {
  ensureMysterySchedule,
  MYSTERY_SCHEDULE_DAYS,
} from "@/lib/mystery/jobs";
import { ensureFootballPlayerCatalog } from "@/lib/mystery/players";
import { maxGuessesFromConfig } from "@/lib/mystery/puzzle";

export type AdminMysteryPuzzleRow = {
  id: string;
  dateKey: string;
  targetPlayerId: string;
  playerNameEn: string;
  playerNameFa: string;
  maxGuesses: number;
  attemptCount: number;
  solvedCount: number;
  createdAt: string;
  isToday: boolean;
};

export type MysteryActionResult =
  | { ok: true; puzzle?: AdminMysteryPuzzleRow }
  | { ok: false; error: string };

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

function serialize(
  row: {
    id: string;
    dateKey: string;
    targetPlayerId: string;
    config: Prisma.JsonValue | null;
    createdAt: Date;
    targetPlayer: { nameEn: string; nameFa: string };
    _count: { attempts: number };
  },
  solvedCount: number,
  todayKey: string,
): AdminMysteryPuzzleRow {
  return {
    id: row.id,
    dateKey: row.dateKey,
    targetPlayerId: row.targetPlayerId,
    playerNameEn: row.targetPlayer.nameEn,
    playerNameFa: row.targetPlayer.nameFa,
    maxGuesses: maxGuessesFromConfig(row.config),
    attemptCount: row._count.attempts,
    solvedCount,
    createdAt: row.createdAt.toISOString(),
    isToday: row.dateKey === todayKey,
  };
}

export async function listAdminMysteryPuzzles(): Promise<{
  todayKey: string;
  puzzles: AdminMysteryPuzzleRow[];
  players: { slug: string; nameEn: string; nameFa: string; isActive: boolean }[];
}> {
  if (!(await assertAdmin())) {
    return { todayKey: tehranDayKey(), puzzles: [], players: [] };
  }
  await ensureFootballPlayerCatalog(prisma);
  const todayKey = tehranDayKey();

  const [puzzles, players, solvedGroups] = await Promise.all([
    prisma.dailyMysteryPuzzle.findMany({
      orderBy: { dateKey: "desc" },
      take: 60,
      include: {
        targetPlayer: { select: { nameEn: true, nameFa: true } },
        _count: { select: { attempts: true } },
      },
    }),
    prisma.footballPlayer.findMany({
      orderBy: [{ isActive: "desc" }, { nameEn: "asc" }],
      select: { slug: true, nameEn: true, nameFa: true, isActive: true },
    }),
    prisma.dailyMysteryAttempt.groupBy({
      by: ["puzzleId"],
      where: { status: "SOLVED" },
      _count: { _all: true },
    }),
  ]);

  const solvedMap = new Map(
    solvedGroups.map((g) => [g.puzzleId, g._count._all]),
  );

  return {
    todayKey,
    players,
    puzzles: puzzles.map((p) =>
      serialize(p, solvedMap.get(p.id) ?? 0, todayKey),
    ),
  };
}

export async function upsertDailyMysteryPuzzle(input: {
  dateKey: string;
  targetPlayerId: string;
  maxGuesses?: number;
}): Promise<MysteryActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  const dateKey = input.dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, error: "date_invalid" };
  }

  const targetPlayerId = input.targetPlayerId.trim();
  if (!targetPlayerId) return { ok: false, error: "player_required" };

  const maxGuesses = Math.min(
    12,
    Math.max(1, Math.round(input.maxGuesses ?? MYSTERY_MAX_GUESSES)),
  );

  try {
    const player = await prisma.footballPlayer.findUnique({
      where: { slug: targetPlayerId },
    });
    if (!player) return { ok: false, error: "player_not_found" };
    if (!player.isActive) return { ok: false, error: "player_inactive" };

    const row = await prisma.dailyMysteryPuzzle.upsert({
      where: { dateKey },
      create: {
        dateKey,
        targetPlayerId,
        config: { maxGuesses },
      },
      update: {
        targetPlayerId,
        config: { maxGuesses },
      },
      include: {
        targetPlayer: { select: { nameEn: true, nameFa: true } },
        _count: { select: { attempts: true } },
      },
    });

    const solvedCount = await prisma.dailyMysteryAttempt.count({
      where: { puzzleId: row.id, status: "SOLVED" },
    });

    revalidatePath("/admin/mystery");
    revalidatePath("/play");
    revalidatePath("/play/mystery");
    revalidatePath("/club");

    return {
      ok: true,
      puzzle: serialize(row, solvedCount, tehranDayKey()),
    };
  } catch (err) {
    console.error("[upsertDailyMysteryPuzzle]", err);
    return { ok: false, error: "unknown" };
  }
}

/**
 * Fill missing Mystery days for Tehran today + horizon (never overwrites).
 * Same job as `/api/cron/mystery` — for Live-Ops one-click from Admin.
 */
export async function ensureMysteryScheduleWeek(
  days = MYSTERY_SCHEDULE_DAYS,
): Promise<
  | { ok: true; todayKey: string; created: number; skipped: number }
  | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };
  try {
    await ensureFootballPlayerCatalog(prisma);
    const stats = await ensureMysterySchedule(prisma, { days });
    revalidatePath("/admin/mystery");
    revalidatePath("/play");
    revalidatePath("/play/mystery");
    revalidatePath("/club");
    return {
      ok: true,
      todayKey: stats.todayKey,
      created: stats.created.length,
      skipped: stats.skipped.length,
    };
  } catch (err) {
    console.error("[ensureMysteryScheduleWeek]", err);
    return { ok: false, error: "unknown" };
  }
}
