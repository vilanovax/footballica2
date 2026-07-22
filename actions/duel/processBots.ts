"use server";

import { tickDuelJobs, type DuelJobStats } from "@/lib/duel/jobs";

/** Explicit cron/manual hook for matchmaking, bots, and turn expiries. */
export async function processDuelBots(): Promise<{ ok: true } & DuelJobStats> {
  const stats = await tickDuelJobs();
  return { ok: true, ...stats };
}
