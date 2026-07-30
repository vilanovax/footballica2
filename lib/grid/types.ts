/** Domain types for Daily Football Grid (ADR 002). Pure — no Prisma. */

export const GRID_SIZE = 3;
export const GRID_MAX_MISTAKES = 9;

/**
 * Axis rule kinds.
 * - `club` = career: current club OR pastClubs (Immortal-style)
 * - `trophy` = major achievement tag on FootballPlayer.trophies
 */
export const GRID_RULE_KINDS = [
  "league",
  "position",
  "nationalityCode",
  "club",
  "trophy",
] as const;

export type GridRuleKind = (typeof GRID_RULE_KINDS)[number];

export function isGridRuleKind(value: unknown): value is GridRuleKind {
  return (
    typeof value === "string" &&
    (GRID_RULE_KINDS as readonly string[]).includes(value)
  );
}

export type GridAxisRule = {
  kind: GridRuleKind;
  value: string;
};

export type GridAxis = {
  id: string;
  labelEn: string;
  labelFa: string;
  rule: GridAxisRule;
};

export type GridCellKey = `${number},${number}`;

export type GridFilledCell = {
  playerId: string;
  nameEn: string;
  nameFa: string;
};

export type GridCellsMap = Partial<Record<GridCellKey, GridFilledCell>>;

export type GridWrongGuess = {
  playerId: string;
  row: number;
  col: number;
  at: string;
};

export type GridAttemptStatus = "IN_PROGRESS" | "SOLVED" | "FAILED";

export type GridPlayerOption = {
  id: string;
  nameEn: string;
  nameFa: string;
  club: string;
  nationalityCode: string;
};

export function cellKey(row: number, col: number): GridCellKey {
  return `${row},${col}`;
}

export function parseCellKey(key: string): { row: number; col: number } | null {
  const m = /^(\d+),(\d+)$/.exec(key);
  if (!m) return null;
  return { row: Number(m[1]), col: Number(m[2]) };
}
