import type { GridAxis, GridCellsMap, GridWrongGuess } from "./types";
import { GRID_SIZE, isGridRuleKind } from "./types";

export function parseGridAxes(raw: unknown): GridAxis[] | null {
  if (!Array.isArray(raw) || raw.length !== GRID_SIZE) return null;
  const out: GridAxis[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const labelEn = typeof o.labelEn === "string" ? o.labelEn : "";
    const labelFa = typeof o.labelFa === "string" ? o.labelFa : "";
    const rule = o.rule;
    if (!id || !labelEn || !labelFa || !rule || typeof rule !== "object") {
      return null;
    }
    const r = rule as Record<string, unknown>;
    const kind = r.kind;
    const value = r.value;
    if (!isGridRuleKind(kind) || typeof value !== "string" || !value.trim()) {
      return null;
    }
    out.push({
      id,
      labelEn,
      labelFa,
      rule: { kind, value: value.trim() },
    });
  }
  return out;
}

export function parseCellsJson(raw: unknown): GridCellsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: GridCellsMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const c = v as Record<string, unknown>;
    if (
      typeof c.playerId === "string" &&
      typeof c.nameEn === "string" &&
      typeof c.nameFa === "string"
    ) {
      out[k as keyof GridCellsMap] = {
        playerId: c.playerId,
        nameEn: c.nameEn,
        nameFa: c.nameFa,
      };
    }
  }
  return out;
}

export function parseGuessesJson(raw: unknown): GridWrongGuess[] {
  if (!Array.isArray(raw)) return [];
  const out: GridWrongGuess[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    if (
      typeof o.playerId === "string" &&
      typeof o.row === "number" &&
      typeof o.col === "number" &&
      typeof o.at === "string"
    ) {
      out.push({
        playerId: o.playerId,
        row: o.row,
        col: o.col,
        at: o.at,
      });
    }
  }
  return out;
}

export function filledCount(cells: GridCellsMap): number {
  return Object.keys(cells).length;
}
