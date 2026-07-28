/**
 * Pure UI rank titles derived from manager level.
 * No DB field — bands are presentation-only for the Profile player card.
 */

export type PlayerTitleBand =
  | "rookie"
  | "rising"
  | "contender"
  | "pro"
  | "elite"
  | "champion"
  | "legend";

/** Map a 1-based level to a display rank band. */
export function playerTitleBand(level: number): PlayerTitleBand {
  const n = Math.max(1, Math.floor(level || 1));
  if (n >= 80) return "legend";
  if (n >= 60) return "champion";
  if (n >= 40) return "elite";
  if (n >= 20) return "pro";
  if (n >= 10) return "contender";
  if (n >= 5) return "rising";
  return "rookie";
}
