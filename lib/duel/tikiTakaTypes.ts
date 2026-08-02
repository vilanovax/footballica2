/**
 * Tiki-Taka — shared PvP tic-tac-toe on Immortal Grid axes.
 * Client-safe types (no server-only imports).
 *
 * Note: `playerId` is the FootballPlayer slug (string), not a numeric PK.
 */

import type { GridAxis } from "@/lib/grid/types";
import { GRID_SIZE, cellKey } from "@/lib/grid/types";

export const TIKI_TAKA_TURN_MS_DEFAULT = 20_000;
export const TIKI_TAKA_SUBMIT_GRACE_MS = 1_500;

export type TikiTakaCellState = {
  /** User id who owns the cell; null = open. */
  ownerId: string | null;
  /** FootballPlayer slug placed in the cell; null = empty. */
  playerId: string | null;
};

export type TikiTakaBoardJson = {
  kind: "TIKI_TAKA";
  axes: {
    rows: GridAxis[];
    cols: GridAxis[];
  };
  cells: Record<string, TikiTakaCellState>;
  /** Footballer slugs already used on this board (once each). */
  usedPlayerIds: string[];
  /** Whose mini-turn it is (user id). */
  turnOwnerId: string;
  /** ISO timestamp when the current 20s clock started (null before begin). */
  turnStartedAt: string | null;
  /** Set when the mini-game ends. */
  status: "IN_PROGRESS" | "COMPLETED";
  /** Winner user id, or null on draw / in progress. */
  winnerId: string | null;
  /** Winning line cell keys when someone got 3-in-a-row. */
  winLine: string[] | null;
};

export type TikiTakaMoveLog = {
  row: number;
  col: number;
  playerId: string;
  correct: boolean;
  timedOut?: boolean;
  byUserId: string;
  at: string;
};

function isAxis(raw: unknown): raw is GridAxis {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Partial<GridAxis>;
  return (
    typeof o.id === "string" &&
    typeof o.labelEn === "string" &&
    typeof o.labelFa === "string" &&
    !!o.rule &&
    typeof o.rule === "object"
  );
}

export function emptyTikiCells(): Record<string, TikiTakaCellState> {
  const cells: Record<string, TikiTakaCellState> = {};
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      cells[cellKey(r, c)] = { ownerId: null, playerId: null };
    }
  }
  return cells;
}

export function parseTikiTakaBoard(raw: unknown): TikiTakaBoardJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<TikiTakaBoardJson>;
  if (o.kind !== "TIKI_TAKA") return null;
  if (!o.axes || typeof o.axes !== "object") return null;
  const rows = Array.isArray(o.axes.rows) ? o.axes.rows.filter(isAxis) : [];
  const cols = Array.isArray(o.axes.cols) ? o.axes.cols.filter(isAxis) : [];
  if (rows.length !== GRID_SIZE || cols.length !== GRID_SIZE) return null;
  if (typeof o.turnOwnerId !== "string" || !o.turnOwnerId) return null;

  const cellsRaw =
    o.cells && typeof o.cells === "object" && !Array.isArray(o.cells)
      ? o.cells
      : {};
  const cells = emptyTikiCells();
  for (const [k, v] of Object.entries(cellsRaw)) {
    if (!v || typeof v !== "object") continue;
    const cell = v as Partial<TikiTakaCellState>;
    cells[k] = {
      ownerId: typeof cell.ownerId === "string" ? cell.ownerId : null,
      playerId: typeof cell.playerId === "string" ? cell.playerId : null,
    };
  }

  const usedPlayerIds = Array.isArray(o.usedPlayerIds)
    ? o.usedPlayerIds.filter((x): x is string => typeof x === "string")
    : [];

  const status =
    o.status === "COMPLETED" || o.status === "IN_PROGRESS"
      ? o.status
      : "IN_PROGRESS";

  return {
    kind: "TIKI_TAKA",
    axes: { rows, cols },
    cells,
    usedPlayerIds,
    turnOwnerId: o.turnOwnerId,
    turnStartedAt:
      typeof o.turnStartedAt === "string" ? o.turnStartedAt : null,
    status,
    winnerId: typeof o.winnerId === "string" ? o.winnerId : null,
    winLine: Array.isArray(o.winLine)
      ? o.winLine.filter((x): x is string => typeof x === "string")
      : null,
  };
}

export function countOwnedCells(
  board: TikiTakaBoardJson,
  ownerId: string,
): number {
  let n = 0;
  for (const cell of Object.values(board.cells)) {
    if (cell.ownerId === ownerId) n += 1;
  }
  return n;
}

export function boardIsFull(board: TikiTakaBoardJson): boolean {
  return Object.values(board.cells).every((c) => c.ownerId != null);
}

/** All 8 winning lines as cell keys. */
export const TIKI_WIN_LINES: string[][] = [
  [cellKey(0, 0), cellKey(0, 1), cellKey(0, 2)],
  [cellKey(1, 0), cellKey(1, 1), cellKey(1, 2)],
  [cellKey(2, 0), cellKey(2, 1), cellKey(2, 2)],
  [cellKey(0, 0), cellKey(1, 0), cellKey(2, 0)],
  [cellKey(0, 1), cellKey(1, 1), cellKey(2, 1)],
  [cellKey(0, 2), cellKey(1, 2), cellKey(2, 2)],
  [cellKey(0, 0), cellKey(1, 1), cellKey(2, 2)],
  [cellKey(0, 2), cellKey(1, 1), cellKey(2, 0)],
];

export function findWinLine(
  board: TikiTakaBoardJson,
  ownerId: string,
): string[] | null {
  for (const line of TIKI_WIN_LINES) {
    if (line.every((k) => board.cells[k]?.ownerId === ownerId)) {
      return line;
    }
  }
  return null;
}

/**
 * After a successful claim (or on full board), resolve round outcome.
 */
export function resolveTikiTakaOutcome(
  board: TikiTakaBoardJson,
  challengerId: string,
  opponentId: string | null,
): {
  status: "IN_PROGRESS" | "COMPLETED";
  winnerId: string | null;
  winLine: string[] | null;
} {
  const lineA = findWinLine(board, challengerId);
  if (lineA) {
    return { status: "COMPLETED", winnerId: challengerId, winLine: lineA };
  }
  if (opponentId) {
    const lineB = findWinLine(board, opponentId);
    if (lineB) {
      return { status: "COMPLETED", winnerId: opponentId, winLine: lineB };
    }
  }
  if (!boardIsFull(board)) {
    return { status: "IN_PROGRESS", winnerId: null, winLine: null };
  }
  const a = countOwnedCells(board, challengerId);
  const b = opponentId ? countOwnedCells(board, opponentId) : 0;
  if (a === b) {
    return { status: "COMPLETED", winnerId: null, winLine: null };
  }
  return {
    status: "COMPLETED",
    winnerId: a > b ? challengerId : opponentId,
    winLine: null,
  };
}

export function isTikiSubmitTooLate(
  turnStartedAt: Date | string | null,
  turnMs: number,
  now: Date = new Date(),
): boolean {
  if (!turnStartedAt) return false;
  const start =
    typeof turnStartedAt === "string"
      ? new Date(turnStartedAt).getTime()
      : turnStartedAt.getTime();
  if (!Number.isFinite(start)) return false;
  return now.getTime() > start + turnMs + TIKI_TAKA_SUBMIT_GRACE_MS;
}

export function tikiEndsAt(
  turnStartedAt: Date | string,
  turnMs: number,
): Date {
  const start =
    typeof turnStartedAt === "string"
      ? new Date(turnStartedAt).getTime()
      : turnStartedAt.getTime();
  return new Date(start + turnMs);
}
