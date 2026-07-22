"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { listDuelEligibleCategories } from "@/lib/duel/draw";
import {
  duelHistoryCutoff,
  pickActiveDuels,
  pickDuelHistory,
} from "@/lib/duel/history";
import { DUEL_TERMINAL } from "@/lib/duel/types";

export type GetMyDuelsResult =
  | {
      ok: true;
      /** Live fixtures (not finished). */
      duels: DuelSnapshot[];
      yourTurn: DuelSnapshot[];
      /** Finished in the last 24h, max 5 — newest first. */
      history: DuelSnapshot[];
    }
  | { ok: false; error: "not_authenticated" | "server_error" };

/**
 * Inbox of the player's duels. Opportunistically runs duel jobs (matchmaking
 * fallback, bots, expiries) so the lobby stays fresh without relying on cron.
 */
export async function getMyDuels(): Promise<GetMyDuelsResult> {
  try {
    await tickDuelJobs();
  } catch (err) {
    console.error("tickDuelJobs in getMyDuels", err);
  }

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const cutoff = duelHistoryCutoff();
    const terminal = Array.from(DUEL_TERMINAL);

    const rows = await prisma.duelMatch.findMany({
      where: {
        OR: [
          {
            AND: [
              { OR: [{ challengerId: user.id }, { opponentId: user.id }] },
              { status: { notIn: terminal } },
            ],
          },
          {
            AND: [
              { OR: [{ challengerId: user.id }, { opponentId: user.id }] },
              { status: { in: terminal } },
              { finishedAt: { gte: cutoff } },
            ],
          },
        ],
      },
      include: duelSnapshotInclude,
      orderBy: { updatedAt: "desc" },
      take: 40,
    });

    const cats = await listDuelEligibleCategories();
    const snapshots = rows.map((d) => {
      const activeRound = d.rounds.find((r) => {
        const turnRound =
          d.status === "A_ATTACKING"
            ? 1
            : d.status === "B_ATTACKING"
              ? 2
              : null;
        return turnRound != null && r.roundNumber === turnRound;
      });
      const draftIds = Array.isArray(activeRound?.draftOptionIds)
        ? (activeRound!.draftOptionIds as string[])
        : [];
      const draftOptions = cats.filter((c) => draftIds.includes(c.id));
      return toDuelSnapshot(
        d,
        user.id,
        draftOptions.length ? draftOptions : undefined,
      );
    });

    const duels = pickActiveDuels(snapshots);
    const history = pickDuelHistory(snapshots);

    // WAITING_* for the viewer means they can begin defend — surface in inbox.
    const inbox = duels.filter((d) => {
      if (d.canAct) return true;
      if (d.status === "WAITING_B" && d.youAre === "opponent") return true;
      if (d.status === "WAITING_A" && d.youAre === "challenger") return true;
      return false;
    });

    return { ok: true, duels, yourTurn: inbox, history };
  } catch (err) {
    console.error("getMyDuels failed", err);
    return { ok: false, error: "server_error" };
  }
}
