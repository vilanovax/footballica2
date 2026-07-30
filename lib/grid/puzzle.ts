import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { tehranDayKey } from "@/lib/game/dailyMissions";
import { ensureFootballPlayerCatalog } from "@/lib/mystery/players";
import {
  careerClubs,
  makeAxis,
  playerMatchesCell,
  toGridPlayerAttrs,
  type GridPlayerAttrs,
} from "./rules";
import type { GridAxis } from "./types";
import { GRID_MAX_MISTAKES, GRID_SIZE } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

type PlayerRow = GridPlayerAttrs & { slug: string };

/**
 * Build a solvable 3×3 from the active catalog.
 * Prefers Immortal club×club when career data is rich, then trophy×club,
 * then league×position / nation×position fallbacks.
 */
export function buildAutoGridAxes(players: PlayerRow[]): {
  rows: GridAxis[];
  cols: GridAxis[];
} | null {
  const immortal = buildClubCrossClub(players);
  if (immortal) return immortal;

  const trophyClub = buildTrophyCrossClub(players);
  if (trophyClub) return trophyClub;

  const leagues = topValues(
    players.map((p) => p.league),
    6,
  );
  const positions = ["FWD", "MID", "DEF", "GK"].filter((pos) =>
    players.some((p) => p.position === pos),
  );

  const leaguePick = pickThreeWithCoverage(
    leagues,
    positions,
    players,
    "league",
  );
  if (leaguePick) {
    return {
      rows: leaguePick.map((v, i) => makeAxis(`r${i}`, "league", v)),
      cols: positions
        .slice(0, GRID_SIZE)
        .map((v, i) => makeAxis(`c${i}`, "position", v)),
    };
  }

  const nations = topValues(
    players.map((p) => p.nationalityCode),
    8,
  );
  const nationPick = pickThreeWithCoverage(
    nations,
    positions,
    players,
    "nationalityCode",
  );
  if (!nationPick) return null;

  return {
    rows: nationPick.map((v, i) => makeAxis(`r${i}`, "nationalityCode", v)),
    cols: positions
      .slice(0, GRID_SIZE)
      .map((v, i) => makeAxis(`c${i}`, "position", v)),
  };
}

/** Immortal-style: 3 career clubs × 3 career clubs. */
function buildClubCrossClub(players: PlayerRow[]): {
  rows: GridAxis[];
  cols: GridAxis[];
} | null {
  const clubs = topValues(
    players.flatMap((p) => careerClubs(p)),
    14,
  );
  if (clubs.length < GRID_SIZE * 2) return null;

  for (let a = 0; a < clubs.length; a++) {
    for (let b = a + 1; b < clubs.length; b++) {
      for (let c = b + 1; c < clubs.length; c++) {
        const rowClubs = [clubs[a]!, clubs[b]!, clubs[c]!];
        const remaining = clubs.filter((x) => !rowClubs.includes(x));
        for (let d = 0; d < remaining.length; d++) {
          for (let e = d + 1; e < remaining.length; e++) {
            for (let f = e + 1; f < remaining.length; f++) {
              const colClubs = [
                remaining[d]!,
                remaining[e]!,
                remaining[f]!,
              ];
              const axesRows = rowClubs.map((v, i) =>
                makeAxis(`r${i}`, "club", v),
              );
              const axesCols = colClubs.map((v, i) =>
                makeAxis(`c${i}`, "club", v),
              );
              if (gridIsSolvable(axesRows, axesCols, players)) {
                return { rows: axesRows, cols: axesCols };
              }
            }
          }
        }
      }
    }
  }
  return null;
}

function buildTrophyCrossClub(players: PlayerRow[]): {
  rows: GridAxis[];
  cols: GridAxis[];
} | null {
  const trophies = topValues(
    players.flatMap((p) => p.trophies),
    10,
  );
  const clubs = topValues(
    players.flatMap((p) => careerClubs(p)),
    10,
  );
  if (trophies.length < GRID_SIZE || clubs.length < GRID_SIZE) return null;

  for (let a = 0; a < trophies.length; a++) {
    for (let b = a + 1; b < trophies.length; b++) {
      for (let c = b + 1; c < trophies.length; c++) {
        const rowT = [trophies[a]!, trophies[b]!, trophies[c]!];
        for (let d = 0; d < clubs.length; d++) {
          for (let e = d + 1; e < clubs.length; e++) {
            for (let f = e + 1; f < clubs.length; f++) {
              const colC = [clubs[d]!, clubs[e]!, clubs[f]!];
              const axesRows = rowT.map((v, i) =>
                makeAxis(`r${i}`, "trophy", v),
              );
              const axesCols = colC.map((v, i) =>
                makeAxis(`c${i}`, "club", v),
              );
              if (gridIsSolvable(axesRows, axesCols, players)) {
                return { rows: axesRows, cols: axesCols };
              }
            }
          }
        }
      }
    }
  }
  return null;
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

export async function loadGridPlayers(db: Db): Promise<PlayerRow[]> {
  await ensureFootballPlayerCatalog(db);
  const rows = await db.footballPlayer.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      league: true,
      position: true,
      nationalityCode: true,
      club: true,
      pastClubs: true,
      trophies: true,
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    ...toGridPlayerAttrs(r),
  }));
}

export async function ensureTodayGridPuzzle(db: Db, now: Date = new Date()) {
  const dateKey = tehranDayKey(now);
  const existing = await db.dailyGridPuzzle.findUnique({ where: { dateKey } });
  if (existing) return existing;

  const players = await loadGridPlayers(db);
  const built = buildAutoGridAxes(players);
  const axes =
    built ??
    (() => {
      const leagues = topValues(
        players.map((p) => p.league),
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
