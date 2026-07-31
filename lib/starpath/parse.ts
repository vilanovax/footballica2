import type { StarPathGuessRecord } from "./types";

export function parseStarPathGuesses(raw: unknown): StarPathGuessRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: StarPathGuessRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<StarPathGuessRecord>;
    if (typeof o.playerId !== "string" || !o.playerId) continue;
    out.push({
      playerId: o.playerId,
      correct: Boolean(o.correct),
      at: typeof o.at === "string" ? o.at : new Date().toISOString(),
    });
  }
  return out;
}
