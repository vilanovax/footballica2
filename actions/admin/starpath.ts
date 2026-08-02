"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { ensureFootballPlayerCatalog } from "@/lib/mystery/players";
import {
  buildStarPathSteps,
  ensureStarPathSchedule,
  maxCluesFromConfig,
  parsePathJson,
  STAR_PATH_MAX_CLUES,
  STAR_PATH_SCHEDULE_DAYS,
} from "@/lib/starpath";

export type AdminStarPathPuzzleRow = {
  id: string;
  dateKey: string;
  targetPlayerId: string;
  playerNameEn: string;
  playerNameFa: string;
  pathLength: number;
  maxClues: number;
  attemptCount: number;
  solvedCount: number;
  createdAt: string;
  isToday: boolean;
};

export type AdminStarPathPlayerOpt = {
  slug: string;
  nameEn: string;
  nameFa: string;
  isActive: boolean;
  pathLength: number;
};

export type StarPathActionResult =
  | { ok: true; puzzle?: AdminStarPathPuzzleRow }
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
    pathJson: Prisma.JsonValue;
    config: Prisma.JsonValue | null;
    createdAt: Date;
    targetPlayer: { nameEn: string; nameFa: string };
    _count: { attempts: number };
  },
  solvedCount: number,
  todayKey: string,
): AdminStarPathPuzzleRow {
  return {
    id: row.id,
    dateKey: row.dateKey,
    targetPlayerId: row.targetPlayerId,
    playerNameEn: row.targetPlayer.nameEn,
    playerNameFa: row.targetPlayer.nameFa,
    pathLength: parsePathJson(row.pathJson).length,
    maxClues: maxCluesFromConfig(row.config),
    attemptCount: row._count.attempts,
    solvedCount,
    createdAt: row.createdAt.toISOString(),
    isToday: row.dateKey === todayKey,
  };
}

export async function listAdminStarPathPuzzles(): Promise<{
  todayKey: string;
  puzzles: AdminStarPathPuzzleRow[];
  players: AdminStarPathPlayerOpt[];
}> {
  if (!(await assertAdmin())) {
    return { todayKey: tehranDayKey(), puzzles: [], players: [] };
  }
  await ensureFootballPlayerCatalog(prisma);
  const todayKey = tehranDayKey();

  const [puzzles, playerRows, solvedGroups] = await Promise.all([
    prisma.dailyStarPathPuzzle.findMany({
      orderBy: { dateKey: "desc" },
      take: 60,
      include: {
        targetPlayer: { select: { nameEn: true, nameFa: true } },
        _count: { select: { attempts: true } },
      },
    }),
    prisma.footballPlayer.findMany({
      orderBy: [{ isActive: "desc" }, { nameEn: "asc" }],
      select: {
        slug: true,
        nameEn: true,
        nameFa: true,
        isActive: true,
        club: true,
        pastClubs: true,
      },
    }),
    prisma.dailyStarPathAttempt.groupBy({
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
    players: playerRows.map((p) => ({
      slug: p.slug,
      nameEn: p.nameEn,
      nameFa: p.nameFa,
      isActive: p.isActive,
      pathLength: buildStarPathSteps(p).length,
    })),
    puzzles: puzzles.map((p) =>
      serialize(p, solvedMap.get(p.id) ?? 0, todayKey),
    ),
  };
}

export async function upsertDailyStarPathPuzzle(input: {
  dateKey: string;
  targetPlayerId: string;
  maxClues?: number;
}): Promise<StarPathActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  const dateKey = input.dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, error: "date_invalid" };
  }

  const targetPlayerId = input.targetPlayerId.trim();
  if (!targetPlayerId) return { ok: false, error: "player_required" };

  const maxClues = Math.min(
    8,
    Math.max(2, Math.round(input.maxClues ?? STAR_PATH_MAX_CLUES)),
  );

  try {
    const player = await prisma.footballPlayer.findUnique({
      where: { slug: targetPlayerId },
      select: {
        slug: true,
        isActive: true,
        club: true,
        pastClubs: true,
      },
    });
    if (!player) return { ok: false, error: "player_not_found" };
    if (!player.isActive) return { ok: false, error: "player_inactive" };

    const path = buildStarPathSteps(player);
    if (path.length < 2) return { ok: false, error: "path_too_short" };

    const row = await prisma.dailyStarPathPuzzle.upsert({
      where: { dateKey },
      create: {
        dateKey,
        targetPlayerId,
        pathJson: path,
        config: { maxClues },
      },
      update: {
        targetPlayerId,
        pathJson: path,
        config: { maxClues },
      },
      include: {
        targetPlayer: { select: { nameEn: true, nameFa: true } },
        _count: { select: { attempts: true } },
      },
    });

    const solvedCount = await prisma.dailyStarPathAttempt.count({
      where: { puzzleId: row.id, status: "SOLVED" },
    });

    revalidatePath("/admin/star-path");
    revalidatePath("/admin/modes");
    revalidatePath("/play");
    revalidatePath("/play/star-path");
    revalidatePath("/club");

    return {
      ok: true,
      puzzle: serialize(row, solvedCount, tehranDayKey()),
    };
  } catch (err) {
    console.error("[upsertDailyStarPathPuzzle]", err);
    return { ok: false, error: "unknown" };
  }
}

/**
 * Fill missing Star Path days for Tehran today + horizon (never overwrites).
 */
export async function ensureStarPathScheduleWeek(
  days = STAR_PATH_SCHEDULE_DAYS,
): Promise<
  | { ok: true; todayKey: string; created: number; skipped: number }
  | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };
  try {
    await ensureFootballPlayerCatalog(prisma);
    const stats = await ensureStarPathSchedule(prisma, { days });
    revalidatePath("/admin/star-path");
    revalidatePath("/admin/modes");
    revalidatePath("/play");
    revalidatePath("/play/star-path");
    revalidatePath("/club");
    return {
      ok: true,
      todayKey: stats.todayKey,
      created: stats.created.length,
      skipped: stats.skipped.length,
    };
  } catch (err) {
    console.error("[ensureStarPathScheduleWeek]", err);
    return { ok: false, error: "unknown" };
  }
}
