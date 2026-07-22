"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/player/current";
import { tickDuelJobs } from "@/lib/duel/jobs";

export type DuelInboxItem = {
  id: string;
  rivalName: string;
  isBot: boolean;
  youScore: number;
  themScore: number;
};

export type GetDuelInboxResult =
  | { ok: true; count: number; items: DuelInboxItem[] }
  | { ok: false; error: "not_authenticated" | "server_error" };

export type GetInboxCountResult =
  | { ok: true; count: number }
  | { ok: false; error: "not_authenticated" | "server_error" };

/**
 * Active duels where it's the viewer's turn — badge + inbox preview.
 */
export async function getDuelInbox(): Promise<GetDuelInboxResult> {
  try {
    await tickDuelJobs(10);
  } catch {
    // Non-fatal
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  try {
    const rows = await prisma.duelMatch.findMany({
      where: {
        turnUserId: user.id,
        status: {
          notIn: ["COMPLETED", "EXPIRED", "FORFEIT", "MATCHING"],
        },
      },
      include: {
        challenger: {
          include: { club: { select: { name: true } } },
        },
        opponent: {
          include: { club: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    });

    const items: DuelInboxItem[] = rows.map((d) => {
      const youAreChallenger = d.challengerId === user.id;
      const rival = youAreChallenger ? d.opponent : d.challenger;
      return {
        id: d.id,
        rivalName:
          rival?.club?.name ??
          rival?.displayName ??
          (d.isBotOpponent ? "Bot" : "Rival"),
        isBot: d.isBotOpponent || Boolean(rival?.isBot),
        youScore: youAreChallenger
          ? d.challengerCorrect
          : d.opponentCorrect,
        themScore: youAreChallenger
          ? d.opponentCorrect
          : d.challengerCorrect,
      };
    });

    return { ok: true, count: items.length, items };
  } catch (err) {
    console.error("getDuelInbox failed", err);
    return { ok: false, error: "server_error" };
  }
}

/** Cheap badge count for Play nav / Club Hub. */
export async function getDuelInboxCount(): Promise<GetInboxCountResult> {
  const res = await getDuelInbox();
  if (!res.ok) return res;
  return { ok: true, count: res.count };
}
