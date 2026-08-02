"use server";

import { lockDuelSpecialRound } from "@/lib/duel/lockSpecialRound";
import { parseGridBoard } from "@/lib/duel/gridTypes";
import type { GridBoardJson } from "@/lib/duel/gridTypes";
import type { DuelSnapshot } from "@/lib/duel/snapshot";

export type SelectGridResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      board: GridBoardJson;
      roundNumber: number;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "special_already_used"
        | "mode_disabled"
        | "already_locked"
        | "server_error";
    };

export async function selectDuelGrid(
  duelId: string,
): Promise<SelectGridResult> {
  const res = await lockDuelSpecialRound(duelId, "grid");
  if (!res.ok) return res;
  const board = parseGridBoard(res.boardJson);
  if (!board) return { ok: false, error: "server_error" };
  return {
    ok: true,
    duel: res.duel,
    board,
    roundNumber: res.roundNumber,
  };
}
