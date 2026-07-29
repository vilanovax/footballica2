"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { ensureFootballPlayerCatalog } from "@/lib/mystery/players";
import { parseGridAxes } from "@/lib/grid/parse";
import { maxMistakesFromConfig, buildAutoGridAxes } from "@/lib/grid/puzzle";
import {
  computeGridSolvability,
  type CellSolvability,
} from "@/lib/grid/solvability";
import { makeAxis } from "@/lib/grid/rules";
import type { GridAxis, GridRuleKind } from "@/lib/grid/types";
import { GRID_MAX_MISTAKES, GRID_SIZE } from "@/lib/grid/types";

export type AdminGridAxisInput = {
  kind: GridRuleKind;
  value: string;
  labelEn?: string;
  labelFa?: string;
};

export type AdminGridPuzzleRow = {
  id: string;
  dateKey: string;
  rows: GridAxis[];
  cols: GridAxis[];
  maxMistakes: number;
  attemptCount: number;
  solvedCount: number;
  solvable: boolean;
  emptyCells: number;
  cellCounts: number[];
  createdAt: string;
  isToday: boolean;
};

export type GridActionResult =
  | { ok: true; puzzle?: AdminGridPuzzleRow }
  | { ok: false; error: string };

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

function axesFromInput(inputs: AdminGridAxisInput[], prefix: "r" | "c"): GridAxis[] | null {
  if (!Array.isArray(inputs) || inputs.length !== GRID_SIZE) return null;
  const out: GridAxis[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const raw = inputs[i];
    if (!raw) return null;
    const kind = raw.kind;
    const value = typeof raw.value === "string" ? raw.value.trim() : "";
    if (
      (kind !== "league" &&
        kind !== "position" &&
        kind !== "nationalityCode" &&
        kind !== "club") ||
      !value
    ) {
      return null;
    }
    const labelEn =
      typeof raw.labelEn === "string" && raw.labelEn.trim()
        ? raw.labelEn.trim()
        : undefined;
    const labelFa =
      typeof raw.labelFa === "string" && raw.labelFa.trim()
        ? raw.labelFa.trim()
        : undefined;
    out.push(
      makeAxis(`${prefix}${i}`, kind, value, {
        labelEn: labelEn ?? value,
        labelFa: labelFa ?? value,
      }),
    );
  }
  return out;
}

async function loadPlayers() {
  return prisma.footballPlayer.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      league: true,
      position: true,
      nationalityCode: true,
      club: true,
    },
  });
}

function serialize(
  row: {
    id: string;
    dateKey: string;
    rowsJson: Prisma.JsonValue;
    colsJson: Prisma.JsonValue;
    config: Prisma.JsonValue | null;
    createdAt: Date;
    _count: { attempts: number };
  },
  solvedCount: number,
  todayKey: string,
  players: Awaited<ReturnType<typeof loadPlayers>>,
): AdminGridPuzzleRow | null {
  const rows = parseGridAxes(row.rowsJson);
  const cols = parseGridAxes(row.colsJson);
  if (!rows || !cols) return null;
  const sol = computeGridSolvability(rows, cols, players);
  return {
    id: row.id,
    dateKey: row.dateKey,
    rows,
    cols,
    maxMistakes: maxMistakesFromConfig(row.config),
    attemptCount: row._count.attempts,
    solvedCount,
    solvable: sol.solvable,
    emptyCells: sol.emptyCells,
    cellCounts: sol.cells.map((c) => c.count),
    createdAt: row.createdAt.toISOString(),
    isToday: row.dateKey === todayKey,
  };
}

export async function listAdminGridPuzzles(): Promise<{
  todayKey: string;
  puzzles: AdminGridPuzzleRow[];
  ruleOptions: {
    leagues: string[];
    positions: string[];
    nationalityCodes: string[];
    clubs: string[];
  };
}> {
  if (!(await assertAdmin())) {
    return {
      todayKey: tehranDayKey(),
      puzzles: [],
      ruleOptions: { leagues: [], positions: [], nationalityCodes: [], clubs: [] },
    };
  }

  await ensureFootballPlayerCatalog(prisma);
  const todayKey = tehranDayKey();
  const players = await loadPlayers();

  const [puzzles, solvedGroups] = await Promise.all([
    prisma.dailyGridPuzzle.findMany({
      orderBy: { dateKey: "desc" },
      take: 60,
      include: { _count: { select: { attempts: true } } },
    }),
    prisma.dailyGridAttempt.groupBy({
      by: ["puzzleId"],
      where: { status: "SOLVED" },
      _count: { _all: true },
    }),
  ]);

  const solvedMap = new Map(
    solvedGroups.map((g) => [g.puzzleId, g._count._all]),
  );

  const uniq = (xs: string[]) =>
    [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  return {
    todayKey,
    ruleOptions: {
      leagues: uniq(players.map((p) => p.league)),
      positions: uniq(players.map((p) => p.position)),
      nationalityCodes: uniq(players.map((p) => p.nationalityCode)),
      clubs: uniq(players.map((p) => p.club)),
    },
    puzzles: puzzles
      .map((p) => serialize(p, solvedMap.get(p.id) ?? 0, todayKey, players))
      .filter((p): p is AdminGridPuzzleRow => Boolean(p)),
  };
}

export async function previewGridSolvability(input: {
  rows: AdminGridAxisInput[];
  cols: AdminGridAxisInput[];
}): Promise<
  | {
      ok: true;
      solvable: boolean;
      emptyCells: number;
      cells: CellSolvability[];
    }
  | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };
  const rows = axesFromInput(input.rows, "r");
  const cols = axesFromInput(input.cols, "c");
  if (!rows || !cols) return { ok: false, error: "axes_invalid" };

  await ensureFootballPlayerCatalog(prisma);
  const players = await loadPlayers();
  const sol = computeGridSolvability(rows, cols, players);
  return {
    ok: true,
    solvable: sol.solvable,
    emptyCells: sol.emptyCells,
    cells: sol.cells,
  };
}

export async function suggestAutoGridAxes(): Promise<
  | { ok: true; rows: GridAxis[]; cols: GridAxis[] }
  | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };
  await ensureFootballPlayerCatalog(prisma);
  const players = await loadPlayers();
  const built = buildAutoGridAxes(players);
  if (!built) return { ok: false, error: "no_solvable_auto" };
  return { ok: true, rows: built.rows, cols: built.cols };
}

export async function upsertDailyGridPuzzle(input: {
  dateKey: string;
  rows: AdminGridAxisInput[];
  cols: AdminGridAxisInput[];
  maxMistakes?: number;
  /** When true, reject save if any cell has zero matching players. */
  requireSolvable?: boolean;
}): Promise<GridActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  const dateKey = input.dateKey.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { ok: false, error: "date_invalid" };
  }

  const rows = axesFromInput(input.rows, "r");
  const cols = axesFromInput(input.cols, "c");
  if (!rows || !cols) return { ok: false, error: "axes_invalid" };

  const maxMistakes = Math.min(
    20,
    Math.max(1, Math.round(input.maxMistakes ?? GRID_MAX_MISTAKES)),
  );

  try {
    await ensureFootballPlayerCatalog(prisma);
    const players = await loadPlayers();
    const sol = computeGridSolvability(rows, cols, players);
    if (input.requireSolvable !== false && !sol.solvable) {
      return { ok: false, error: "not_solvable" };
    }

    const row = await prisma.dailyGridPuzzle.upsert({
      where: { dateKey },
      create: {
        dateKey,
        rowsJson: rows as unknown as Prisma.InputJsonValue,
        colsJson: cols as unknown as Prisma.InputJsonValue,
        config: { maxMistakes },
      },
      update: {
        rowsJson: rows as unknown as Prisma.InputJsonValue,
        colsJson: cols as unknown as Prisma.InputJsonValue,
        config: { maxMistakes },
      },
      include: { _count: { select: { attempts: true } } },
    });

    const solvedCount = await prisma.dailyGridAttempt.count({
      where: { puzzleId: row.id, status: "SOLVED" },
    });

    const puzzle = serialize(row, solvedCount, tehranDayKey(), players);
    if (!puzzle) return { ok: false, error: "unknown" };

    revalidatePath("/admin/grid");
    revalidatePath("/play");
    revalidatePath("/play/grid");
    revalidatePath("/club");

    return { ok: true, puzzle };
  } catch (err) {
    console.error("[upsertDailyGridPuzzle]", err);
    return { ok: false, error: "unknown" };
  }
}
