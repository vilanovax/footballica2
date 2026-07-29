import type { GridCellsMap } from "./types";
import { GRID_SIZE, cellKey } from "./types";

/** Compact share string: 🟩 filled / ⬜ empty, 3 rows. */
export function buildGridShareCode(cells: GridCellsMap): string {
  const lines: string[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    let line = "";
    for (let c = 0; c < GRID_SIZE; c++) {
      line += cells[cellKey(r, c)] ? "🟩" : "⬜";
    }
    lines.push(line);
  }
  return lines.join("\n");
}
