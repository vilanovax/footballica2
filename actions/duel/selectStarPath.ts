"use server";

import { lockDuelSpecialRound } from "@/lib/duel/lockSpecialRound";
import { parseStarPathBoard } from "@/lib/duel/starPathTypes";
import type { StarPathBoardJson } from "@/lib/duel/starPathTypes";
import type { DuelSnapshot } from "@/lib/duel/snapshot";

export type SelectStarPathResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      board: StarPathBoardJson;
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

export async function selectDuelStarPath(
  duelId: string,
): Promise<SelectStarPathResult> {
  const res = await lockDuelSpecialRound(duelId, "starPath");
  if (!res.ok) return res;
  const board = parseStarPathBoard(res.boardJson);
  if (!board) return { ok: false, error: "server_error" };
  return {
    ok: true,
    duel: res.duel,
    board,
    roundNumber: res.roundNumber,
  };
}
