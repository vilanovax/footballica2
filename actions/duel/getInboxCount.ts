"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/player/current";
import { tickDuelJobs } from "@/lib/duel/jobs";
import type { DuelStatus } from "@/generated/prisma/client";

export type DuelInboxAction = "attack" | "defend" | "act";

export type DuelInboxItem = {
  id: string;
  rivalName: string;
  isBot: boolean;
  youScore: number;
  themScore: number;
  status: DuelStatus;
  /** What the viewer should do on open. */
  action: DuelInboxAction;
  /** ISO turn soft-deadline, if any. */
  turnDeadlineAt: string | null;
};

export type GetDuelInboxResult =
  | { ok: true; count: number; items: DuelInboxItem[] }
  | { ok: false; error: "not_authenticated" | "server_error" };

export type GetInboxCountResult =
  | { ok: true; count: number; topId: string | null }
  | { ok: false; error: "not_authenticated" | "server_error" };

function inboxAction(status: DuelStatus): DuelInboxAction {
  if (status === "A_ATTACKING" || status === "B_ATTACKING") return "attack";
  if (
    status === "A_DEFENDING" ||
    status === "B_DEFENDING" ||
    status === "WAITING_A" ||
    status === "WAITING_B"
  ) {
    return "defend";
  }
  return "act";
}

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
      orderBy: [{ turnDeadlineAt: "asc" }, { updatedAt: "desc" }],
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
        status: d.status,
        action: inboxAction(d.status),
        turnDeadlineAt: d.turnDeadlineAt?.toISOString() ?? null,
      };
    });

    return { ok: true, count: items.length, items };
  } catch (err) {
    console.error("getDuelInbox failed", err);
    return { ok: false, error: "server_error" };
  }
}

/** Cheap badge count for Play nav / Club Hub (+ top duel id for deep links). */
export async function getDuelInboxCount(): Promise<GetInboxCountResult> {
  const res = await getDuelInbox();
  if (!res.ok) return res;
  return {
    ok: true,
    count: res.count,
    topId: res.items[0]?.id ?? null,
  };
}
