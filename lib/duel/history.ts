import type { DuelSnapshot } from "@/lib/duel/snapshot";
import {
  DUEL_HISTORY_HOURS,
  DUEL_HISTORY_LIMIT,
  isDuelTerminal,
} from "@/lib/duel/types";

/** Cutoff for “recent history” windows (default: last 24h). */
export function duelHistoryCutoff(now = Date.now()): Date {
  return new Date(now - DUEL_HISTORY_HOURS * 60 * 60 * 1000);
}

/**
 * Finished duels within the retention window, newest first, capped.
 * Does not mutate the input list.
 */
export function pickDuelHistory(
  duels: DuelSnapshot[],
  now = Date.now(),
): DuelSnapshot[] {
  const cutoffMs = duelHistoryCutoff(now).getTime();
  return duels
    .filter((d) => {
      if (!isDuelTerminal(d.status)) return false;
      if (!d.finishedAt) return false;
      return new Date(d.finishedAt).getTime() >= cutoffMs;
    })
    .sort((a, b) => {
      const ta = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const tb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, DUEL_HISTORY_LIMIT);
}

export function pickActiveDuels(duels: DuelSnapshot[]): DuelSnapshot[] {
  return duels.filter((d) => !isDuelTerminal(d.status));
}

export type DuelViewerOutcome = "WIN" | "LOSE" | "DRAW";

export function duelViewerOutcome(d: DuelSnapshot): DuelViewerOutcome {
  // AFK timeout — always present as a loss (never reveal Shadow Bot).
  if (d.youTimedOut) return "LOSE";
  if (d.winnerId == null) return "DRAW";
  const youId =
    d.youAre === "challenger"
      ? d.challengerId
      : d.youAre === "opponent"
        ? d.opponentId
        : null;
  if (youId != null && d.winnerId === youId) return "WIN";
  return "LOSE";
}
