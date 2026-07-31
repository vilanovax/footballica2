import "server-only";

import { asGridTagList } from "@/lib/grid/rules";
import type { StarPathClubStep } from "./types";
import { STAR_PATH_MAX_CLUES } from "./types";

/**
 * Build ordered club path for Star Path from catalog fields.
 * pastClubs (career order) + current club if not already listed.
 * Caps at STAR_PATH_MAX_CLUES steps for the daily puzzle.
 */
export function buildStarPathSteps(row: {
  club: string;
  pastClubs?: unknown;
}): StarPathClubStep[] {
  const past = asGridTagList(row.pastClubs);
  const current = row.club.trim();
  const steps: string[] = [...past];
  if (current) {
    const hasCurrent = steps.some(
      (s) => s.trim().toLowerCase() === current.toLowerCase(),
    );
    if (!hasCurrent) steps.push(current);
  }
  return steps.slice(0, STAR_PATH_MAX_CLUES).map((name) => ({ name }));
}

export function parsePathJson(raw: unknown): StarPathClubStep[] {
  if (!Array.isArray(raw)) return [];
  const out: StarPathClubStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = (item as { name?: unknown }).name;
    if (typeof name !== "string" || !name.trim()) continue;
    out.push({ name: name.trim() });
  }
  return out;
}
