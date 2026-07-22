import "server-only";

import { processDueBotTurns } from "@/lib/duel/bot";
import { processExpiredDuels } from "@/lib/duel/expire";
import {
  pairOpenMatchingDuels,
  processMatchingTimeouts,
} from "@/lib/duel/matchmaking";
import { ensureWeeklyLeagueReset } from "@/lib/game/weeklyLeague";

export type DuelJobStats = {
  paired: number;
  bots: number;
  matching: number;
  expired: number;
  weeklyReset: boolean;
};

/**
 * Single entry for cron + opportunistic ticks on duel reads.
 * Order: human pair → matchmaking bot fallback → bot plays → turn forfeits → week reset.
 */
export async function tickDuelJobs(limit = 40): Promise<DuelJobStats> {
  const paired = await pairOpenMatchingDuels(limit);
  const matching = await processMatchingTimeouts(limit);
  const bots = await processDueBotTurns(limit);
  const expired = await processExpiredDuels(limit);
  let weeklyReset = false;
  try {
    const league = await ensureWeeklyLeagueReset();
    weeklyReset = league.reset;
  } catch (err) {
    console.error("ensureWeeklyLeagueReset", err);
  }
  return { paired, bots, matching, expired, weeklyReset };
}
