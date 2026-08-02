"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { requireUserClub } from "@/lib/player/current";
import { canUserAct, statusWhenStartingDefend } from "@/lib/duel";
import {
  parseTikiTakaBoard,
  tikiEndsAt,
  type TikiTakaBoardJson,
} from "@/lib/duel/tikiTakaTypes";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";

export type BeginTikiTakaResult =
  | {
      ok: true;
      board: TikiTakaBoardJson;
      endsAt: string;
      turnMs: number;
      duel: DuelSnapshot;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "not_tiki"
        | "already_done"
        | "server_error";
    };

/**
 * Open a Tiki-Taka mini-turn: stamp turnStartedAt (20s clock) for turnOwner.
 */
export async function beginTikiTakaTurn(
  duelId: string,
): Promise<BeginTikiTakaResult> {
  void tickDuelJobs();

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const config = await getGameConfig();
    let duel = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: duelSnapshotInclude,
    });
    if (!duel) return { ok: false, error: "not_found" };
    if (duel.timeoutUserId === user.id) {
      return { ok: false, error: "not_your_turn" };
    }

    let status = duel.status;
    const startDefend = statusWhenStartingDefend(status);
    if (startDefend) {
      const expected =
        status === "WAITING_B" ? duel.opponentId : duel.challengerId;
      if (user.id !== expected) return { ok: false, error: "not_your_turn" };

      duel = await prisma.duelMatch.update({
        where: { id: duel.id },
        data: { status: startDefend, turnUserId: user.id },
        include: duelSnapshotInclude,
      });
      status = duel.status;
    }

    if (
      !canUserAct({
        status,
        userId: user.id,
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
      })
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const round =
      duel.rounds.find((r) => {
        // Active special round still in progress
        if (r.roundType !== "TIKI_TAKA") return false;
        if (r.attackSubmittedAt && r.defenseSubmittedAt) return false;
        return true;
      }) ?? null;

    // Prefer turn's roundNumber when available
    const { describeTurn } = await import("@/lib/duel");
    const turn = describeTurn(status);
    const byTurn =
      turn.roundNumber != null
        ? duel.rounds.find((r) => r.roundNumber === turn.roundNumber)
        : null;
    const active = byTurn?.roundType === "TIKI_TAKA" ? byTurn : round;
    if (!active || active.roundType !== "TIKI_TAKA") {
      return { ok: false, error: "not_tiki" };
    }

    const board = parseTikiTakaBoard(active.boardJson);
    if (!board) return { ok: false, error: "not_found" };
    if (board.status === "COMPLETED") {
      return { ok: false, error: "already_done" };
    }
    if (board.turnOwnerId !== user.id) {
      return { ok: false, error: "not_your_turn" };
    }

    const now = new Date();
    const turnMs = config.duel.tikiTakaTurnMs;
    let nextBoard = board;

    if (!board.turnStartedAt) {
      nextBoard = {
        ...board,
        turnStartedAt: now.toISOString(),
      };
      await prisma.duelRound.update({
        where: { id: active.id },
        data: {
          boardJson: nextBoard as unknown as Prisma.InputJsonValue,
          // Stamp attack/defense start for HUD parity
          ...(user.id === active.attackerId
            ? { attackStartedAt: active.attackStartedAt ?? now }
            : { defenseStartedAt: active.defenseStartedAt ?? now }),
        },
      });
    }

    const started = nextBoard.turnStartedAt
      ? new Date(nextBoard.turnStartedAt)
      : now;
    const endsAt = tikiEndsAt(started, turnMs);

    const refreshed = await prisma.duelMatch.findUniqueOrThrow({
      where: { id: duel.id },
      include: duelSnapshotInclude,
    });

    return {
      ok: true,
      board: nextBoard,
      endsAt: endsAt.toISOString(),
      turnMs,
      duel: toDuelSnapshot(refreshed, user.id, {
        liveModes: config.liveModes,
      }),
    };
  } catch (err) {
    console.error("beginTikiTakaTurn failed", err);
    return { ok: false, error: "server_error" };
  }
}
