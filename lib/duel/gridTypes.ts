import type {
  GridAxis,
  GridCellsMap,
  GridWrongGuess,
} from "@/lib/grid/types";
import { GRID_MAX_MISTAKES, GRID_SIZE } from "@/lib/grid/types";

/** Frozen Grid payload on DuelRound.boardJson. */
export type GridBoardJson = {
  kind: "GRID";
  rows: GridAxis[];
  cols: GridAxis[];
  maxMistakes: number;
};

export type GridHalfLog = {
  cells: GridCellsMap;
  wrongGuesses: GridWrongGuess[];
  status: "SOLVED" | "FAILED" | "IN_PROGRESS";
  /** Filled correct cells (0..9). */
  score: number;
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

export function parseGridBoard(raw: unknown): GridBoardJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<GridBoardJson>;
  if (o.kind !== "GRID") return null;
  if (!Array.isArray(o.rows) || !Array.isArray(o.cols)) return null;
  const rows = o.rows.filter(isAxis);
  const cols = o.cols.filter(isAxis);
  if (rows.length !== GRID_SIZE || cols.length !== GRID_SIZE) return null;
  const maxMistakes =
    typeof o.maxMistakes === "number" && o.maxMistakes >= 1
      ? Math.min(20, Math.floor(o.maxMistakes))
      : GRID_MAX_MISTAKES;
  return { kind: "GRID", rows, cols, maxMistakes };
}

export function parseGridHalfLog(raw: unknown): GridHalfLog | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<GridHalfLog>;
  const status =
    o.status === "SOLVED" || o.status === "FAILED" || o.status === "IN_PROGRESS"
      ? o.status
      : null;
  if (!status) return null;
  return {
    cells: (o.cells && typeof o.cells === "object"
      ? o.cells
      : {}) as GridCellsMap,
    wrongGuesses: Array.isArray(o.wrongGuesses)
      ? (o.wrongGuesses as GridWrongGuess[])
      : [],
    status,
    score: typeof o.score === "number" ? Math.max(0, o.score) : 0,
  };
}

export function countFilledCells(cells: GridCellsMap): number {
  return Object.values(cells).filter(Boolean).length;
}
