import type { GridAxis } from "./types";
import { GRID_SIZE, cellKey } from "./types";
import { playerMatchesCell, type GridPlayerAttrs } from "./rules";

export type GridPlayerRow = GridPlayerAttrs & { slug: string };

export type CellSolvability = {
  key: string;
  row: number;
  col: number;
  count: number;
  sampleSlugs: string[];
};

/** How many active catalog players fit each of the 9 cells. */
export function computeGridSolvability(
  rows: GridAxis[],
  cols: GridAxis[],
  players: GridPlayerRow[],
): { cells: CellSolvability[]; solvable: boolean; emptyCells: number } {
  const cells: CellSolvability[] = [];
  let emptyCells = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const matches = players.filter((p) =>
        playerMatchesCell(p, rows[r]!, cols[c]!),
      );
      if (matches.length === 0) emptyCells += 1;
      cells.push({
        key: cellKey(r, c),
        row: r,
        col: c,
        count: matches.length,
        sampleSlugs: matches.slice(0, 3).map((m) => m.slug),
      });
    }
  }

  return {
    cells,
    solvable: emptyCells === 0,
    emptyCells,
  };
}
