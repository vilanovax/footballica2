"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { ensureFootballPlayerCatalog, listMysteryOptions } from "@/lib/mystery/players";
import {
  ensureTodayGridPuzzle,
  maxMistakesFromConfig,
} from "@/lib/grid/puzzle";
import {
  filledCount,
  parseCellsJson,
  parseGridAxes,
} from "@/lib/grid/parse";
import type {
  GridAttemptStatus,
  GridAxis,
  GridCellsMap,
  GridPlayerOption,
} from "@/lib/grid/types";
import { GRID_SIZE } from "@/lib/grid/types";

export type DailyGridSnapshot = {
  dateKey: string;
  status: GridAttemptStatus;
  rows: GridAxis[];
  cols: GridAxis[];
  cells: GridCellsMap;
  mistakeCount: number;
  maxMistakes: number;
  filled: number;
  totalCells: number;
  shareCode: string | null;
  gridStreak: number;
  options: GridPlayerOption[];
};

export type GetDailyGridResult =
  | { ok: true; grid: DailyGridSnapshot }
  | { ok: false; error: string };

export async function getDailyGrid(): Promise<GetDailyGridResult> {
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { club } = pair;

  await ensureFootballPlayerCatalog(prisma);
  const puzzle = await ensureTodayGridPuzzle(prisma);
  const rows = parseGridAxes(puzzle.rowsJson);
  const cols = parseGridAxes(puzzle.colsJson);
  if (!rows || !cols) return { ok: false, error: "invalid_puzzle" };

  const attempt = await prisma.dailyGridAttempt.upsert({
    where: {
      clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
    },
    create: { clubId: club.id, puzzleId: puzzle.id },
    update: {},
  });

  const cells = parseCellsJson(attempt.cellsJson);
  const options = await listMysteryOptions(prisma);

  return {
    ok: true,
    grid: {
      dateKey: puzzle.dateKey,
      status: attempt.status,
      rows,
      cols,
      cells,
      mistakeCount: attempt.mistakeCount,
      maxMistakes: maxMistakesFromConfig(puzzle.config),
      filled: filledCount(cells),
      totalCells: GRID_SIZE * GRID_SIZE,
      shareCode: attempt.shareCode,
      gridStreak: club.gridStreak,
      options,
    },
  };
}
