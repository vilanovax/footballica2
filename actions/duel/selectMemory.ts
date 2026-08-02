"use server";

import { lockDuelSpecialRound } from "@/lib/duel/lockSpecialRound";
import { parseMemoryBoard } from "@/lib/duel/memoryTypes";
import type { MemoryBoardJson } from "@/lib/duel/memoryTypes";
import type { DuelSnapshot } from "@/lib/duel/snapshot";

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
        | "special_already_used"
        | "mode_disabled"
        | "already_locked"
        | "server_error";
    };

/**
 * Lock the active attack round as MEMORY (once per duel special).
 * Idempotent if this round is already MEMORY with a board.
 */
export async function selectDuelMemory(
  duelId: string,
): Promise<SelectMemoryResult> {
  const res = await lockDuelSpecialRound(duelId, "memory");
  if (!res.ok) {
    if (res.error === "special_already_used") {
      return { ok: false, error: "memory_already_used" };
    }
    return res;
  }
  const board = parseMemoryBoard(res.boardJson);
  if (!board) return { ok: false, error: "server_error" };
  return {
    ok: true,
    duel: res.duel,
    board,
    roundNumber: res.roundNumber,
  };
}
