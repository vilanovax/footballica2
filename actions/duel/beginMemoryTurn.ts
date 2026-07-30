"use server";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { requireUserClub } from "@/lib/player/current";
import {
  canUserAct,
  describeTurn,
  statusWhenStartingDefend,
} from "@/lib/duel";
import { parseMemoryBoard } from "@/lib/duel/memoryBoard";
import { memoryEndsAt } from "@/lib/duel/memoryGrade";
import type { MemoryBoardJson } from "@/lib/duel/memoryTypes";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";

export type BeginMemoryResult =
  | {
      ok: true;
      mode: "attack" | "defend";
      board: MemoryBoardJson;
      endsAt: string;
      turnMs: number;
      revealMs: number;
      duel: DuelSnapshot;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "not_memory"
        | "already_submitted"
        | "server_error";
    };

/**
 * Open a MEMORY half: stamp attackStartedAt / defenseStartedAt (clock start)
 * and return the shared board + server deadline.
 */
export async function beginMemoryTurn(
  duelId: string,
): Promise<BeginMemoryResult> {
  void tickDuelJobs();

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const duel = await prisma.duelMatch.findUnique({
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

      const updated = await prisma.duelMatch.update({
        where: { id: duel.id },
        data: { status: startDefend, turnUserId: user.id },
        include: duelSnapshotInclude,
      });
      status = updated.status;
      Object.assign(duel, updated);
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

    const turn = describeTurn(status);
    if (
      (turn.kind !== "attack" && turn.kind !== "defend") ||
      turn.roundNumber == null
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const round = duel.rounds.find((r) => r.roundNumber === turn.roundNumber);
    if (!round || round.roundType !== "MEMORY") {
      return { ok: false, error: "not_memory" };
    }

    const board = parseMemoryBoard(round.boardJson);
    if (!board) return { ok: false, error: "not_found" };

    const mode = turn.kind === "attack" ? "attack" : "defend";
    if (mode === "attack" && round.attackSubmittedAt) {
      return { ok: false, error: "already_submitted" };
    }
    if (mode === "defend" && round.defenseSubmittedAt) {
      return { ok: false, error: "already_submitted" };
    }

    const config = await getGameConfig();
    const now = new Date();
    let startedAt =
      mode === "attack" ? round.attackStartedAt : round.defenseStartedAt;

    if (!startedAt) {
      startedAt = now;
      await prisma.duelRound.update({
        where: { id: round.id },
        data:
          mode === "attack"
            ? { attackStartedAt: now }
            : { defenseStartedAt: now },
      });
      if (mode === "attack") round.attackStartedAt = now;
      else round.defenseStartedAt = now;
    }

    const endsAt = memoryEndsAt(startedAt, config.duel.memoryTurnMs);

    // Refresh snapshot so memoryEndsAt is current.
    const fresh = await prisma.duelMatch.findUnique({
      where: { id: duel.id },
      include: duelSnapshotInclude,
    });
    if (!fresh) return { ok: false, error: "not_found" };

    return {
      ok: true,
      mode,
      board,
      endsAt: endsAt.toISOString(),
      turnMs: config.duel.memoryTurnMs,
      revealMs: config.duel.memoryRevealMs,
      duel: toDuelSnapshot(fresh, user.id),
    };
  } catch (err) {
    console.error("beginMemoryTurn failed", err);
    return { ok: false, error: "server_error" };
  }
}
