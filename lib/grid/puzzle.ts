import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { ensureFootballPlayerCatalog } from "@/lib/mystery/players";
import { makeAxis, playerMatchesCell, type GridPlayerAttrs } from "./rules";
import type { GridAxis } from "./types";
import { GRID_MAX_MISTAKES, GRID_SIZE } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

type PlayerRow = GridPlayerAttrs & { slug: string };

/**
 * Build a solvable 3×3 from the active catalog (league × position).
 * Falls back to nationalityCode × position if leagues are too sparse.
 */
export function buildAutoGridAxes(players: PlayerRow[]): {
  rows: GridAxis[];
  cols: GridAxis[];
} | null {
  const leagues = topValues(players.map((p) => p.league), 6);
  const positions = ["FWD", "MID", "DEF", "GK"].filter((pos) =>
    players.some((p) => p.position === pos),
  );

  const leaguePick = pickThreeWithCoverage(leagues, positions, players, "league");
  if (leaguePick) {
    return {
      rows: leaguePick.map((v, i) => makeAxis(`r${i}`, "league", v)),
      cols: positions.slice(0, GRID_SIZE).map((v, i) =>
        makeAxis(`c${i}`, "position", v),
      ),
    };
  }

  const nations = topValues(players.map((p) => p.nationalityCode), 8);
  const nationPick = pickThreeWithCoverage(
    nations,
    positions,
    players,
    "nationalityCode",
  );
  if (!nationPick) return null;

  return {
    rows: nationPick.map((v, i) => makeAxis(`r${i}`, "nationalityCode", v)),
    cols: positions.slice(0, GRID_SIZE).map((v, i) =>
      makeAxis(`c${i}`, "position", v),
    ),
  };
}

function topValues(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function pickThreeWithCoverage(
  rowValues: string[],
  colPositions: string[],
  players: PlayerRow[],
  rowKind: "league" | "nationalityCode",
): string[] | null {
  const cols = colPositions.slice(0, GRID_SIZE);
  if (cols.length < GRID_SIZE) return null;

  for (let a = 0; a < rowValues.length; a++) {
    for (let b = a + 1; b < rowValues.length; b++) {
      for (let c = b + 1; c < rowValues.length; c++) {
        const rows = [rowValues[a]!, rowValues[b]!, rowValues[c]!];
        const axesRows = rows.map((v, i) => makeAxis(`r${i}`, rowKind, v));
        const axesCols = cols.map((v, i) => makeAxis(`c${i}`, "position", v));
        if (gridIsSolvable(axesRows, axesCols, players)) return rows;
      }
    }
  }
  return null;
}

function gridIsSolvable(
  rows: GridAxis[],
  cols: GridAxis[],
  players: PlayerRow[],
): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const ok = players.some((p) =>
        playerMatchesCell(p, rows[r]!, cols[c]!),
      );
      if (!ok) return false;
    }
  }
  return true;
}

export async function ensureTodayGridPuzzle(db: Db, now: Date = new Date()) {
  const dateKey = tehranDayKey(now);
  const existing = await db.dailyGridPuzzle.findUnique({ where: { dateKey } });
  if (existing) return existing;

  await ensureFootballPlayerCatalog(db);

  const rows = await db.footballPlayer.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      league: true,
      position: true,
      nationalityCode: true,
      club: true,
    },
  });

  const built = buildAutoGridAxes(rows);
  const axes =
    built ??
    (() => {
      const leagues = topValues(
        rows.map((p) => p.league),
        3,
      );
      while (leagues.length < 3) leagues.push(`League ${leagues.length + 1}`);
      return {
        rows: leagues
          .slice(0, 3)
          .map((v, i) => makeAxis(`r${i}`, "league", v)),
        cols: ["FWD", "MID", "DEF"].map((v, i) =>
          makeAxis(`c${i}`, "position", v),
        ),
      };
    })();

  return db.dailyGridPuzzle.create({
    data: {
      dateKey,
      rowsJson: axes.rows as unknown as Prisma.InputJsonValue,
      colsJson: axes.cols as unknown as Prisma.InputJsonValue,
      config: { maxMistakes: GRID_MAX_MISTAKES },
    },
  });
}

export function maxMistakesFromConfig(config: Prisma.JsonValue | null): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const n = (config as { maxMistakes?: unknown }).maxMistakes;
    if (typeof n === "number" && n >= 1 && n <= 20) return Math.floor(n);
  }
  return GRID_MAX_MISTAKES;
}
