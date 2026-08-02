"use server";

import { requireUserClub } from "@/lib/player/current";
import { canUserAct, describeTurn, statusWhenStartingDefend } from "@/lib/duel";
import { prisma } from "@/lib/prisma";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { executeTikiTakaGuess } from "@/lib/duel/tikiTakaPlay";
import type { TikiTakaBoardJson } from "@/lib/duel/tikiTakaTypes";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

export type SubmitTikiTakaResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      board: TikiTakaBoardJson;
      correct: boolean;
      finished: boolean;
      missions?: EvaluateMissionsResult;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "not_tiki"
        | "already_done"
        | "cell_taken"
        | "player_used"
        | "unknown_player"
        | "invalid_cell"
        | "turn_expired"
        | "server_error";
    };

/**
 * Submit a Tiki-Taka guess for (row,col).
 * Wrong / timeout → lose turn, cell stays open.
 * Correct → claim cell, then win-check or swap turn.
 */
export async function submitTikiTakaGuess(input: {
  duelId: string;
  row: number;
  col: number;
  playerId: string;
  /** Client signals clock already expired (server still re-checks). */
  timedOut?: boolean;
}): Promise<SubmitTikiTakaResult> {
  void tickDuelJobs();

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    let duel = await prisma.duelMatch.findUnique({
      where: { id: input.duelId },
      include: duelSnapshotInclude,
    });
    if (!duel) return { ok: false, error: "not_found" };
    if (duel.timeoutUserId === user.id) {
      return { ok: false, error: "not_your_turn" };
    }

    // Claim WAITING_* → active defend so canUserAct passes (shared board turns).
    const startDefend = statusWhenStartingDefend(duel.status);
    if (startDefend) {
      const expected =
        duel.status === "WAITING_B" ? duel.opponentId : duel.challengerId;
      if (user.id !== expected) return { ok: false, error: "not_your_turn" };
      duel = await prisma.duelMatch.update({
        where: { id: duel.id },
        data: { status: startDefend, turnUserId: user.id },
        include: duelSnapshotInclude,
      });
    }

    if (
      !canUserAct({
        status: duel.status,
        userId: user.id,
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
      })
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const turn = describeTurn(duel.status);
    if (
      (turn.kind !== "attack" && turn.kind !== "defend") ||
      turn.roundNumber == null
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    return executeTikiTakaGuess({
      duelId: input.duelId,
      userId: user.id,
      row: input.row,
      col: input.col,
      playerId: input.playerId,
      timedOut: input.timedOut,
      viewerId: user.id,
    });
  } catch (err) {
    console.error("submitTikiTakaGuess failed", err);
    return { ok: false, error: "server_error" };
  }
}
