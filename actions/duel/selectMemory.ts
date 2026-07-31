"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { requireUserClub } from "@/lib/player/current";
import { canUserAct, describeTurn } from "@/lib/duel";
import {
  duelHasMemoryRound,
  memoryRoundCreateData,
} from "@/lib/duel/createMemoryRound";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import type { MemoryBoardJson } from "@/lib/duel/memoryTypes";

export type SelectMemoryResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      board: MemoryBoardJson;
      roundNumber: number;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "memory_already_used"
        | "already_locked"
        | "server_error";
    };

/**
 * Lock the active attack round as MEMORY (once per duel).
 * Idempotent if this round is already MEMORY with a board.
 */
export async function selectDuelMemory(
  duelId: string,
): Promise<SelectMemoryResult> {
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
    if (turn.kind !== "attack" || turn.roundNumber == null) {
      return { ok: false, error: "not_your_turn" };
    }

    const round = duel.rounds.find((r) => r.roundNumber === turn.roundNumber);
    if (!round) return { ok: false, error: "not_found" };

    if (round.attackSubmittedAt) {
      return { ok: false, error: "already_locked" };
    }

    // Idempotent reopen if this round already locked Memory.
    if (round.roundType === "MEMORY") {
      const existing = round.boardJson as MemoryBoardJson | null;
      if (existing?.cards?.length) {
        return {
          ok: true,
          duel: toDuelSnapshot(duel, user.id),
          board: existing,
          roundNumber: round.roundNumber,
        };
      }
    }

    if (duelHasMemoryRound(duel.rounds.filter((r) => r.id !== round.id))) {
      return { ok: false, error: "memory_already_used" };
    }

    if (
      round.categoryId ||
      (Array.isArray(round.questionIds) &&
        (round.questionIds as unknown[]).length > 0)
    ) {
      return { ok: false, error: "already_locked" };
    }

    const config = await getGameConfig();
    const memoryData = await memoryRoundCreateData({
      duelId: duel.id,
      attackerId: user.id,
      pairCount: config.duel.memoryPairs,
      roundNumber: round.roundNumber,
    });

    await prisma.duelRound.update({
      where: { id: round.id },
      data: {
        roundType: "MEMORY",
        categoryId: null,
        questionIds: Prisma.DbNull,
        draftOptionIds: [],
        boardJson: memoryData.boardJson,
        attackerId: user.id,
      },
    });

    const refreshed = await prisma.duelMatch.findUniqueOrThrow({
      where: { id: duel.id },
      include: duelSnapshotInclude,
    });

    return {
      ok: true,
      duel: toDuelSnapshot(refreshed, user.id),
      board: memoryData.board,
      roundNumber: round.roundNumber,
    };
  } catch (err) {
    console.error("selectDuelMemory failed", err);
    return { ok: false, error: "server_error" };
  }
}
