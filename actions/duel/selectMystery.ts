"use server";

import { lockDuelSpecialRound } from "@/lib/duel/lockSpecialRound";
import { parseMysteryBoard } from "@/lib/duel/mysteryTypes";
import type { MysteryBoardJson } from "@/lib/duel/mysteryTypes";
import type { DuelSnapshot } from "@/lib/duel/snapshot";

export type SelectMysteryResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      board: MysteryBoardJson;
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

export async function selectDuelMystery(
  duelId: string,
): Promise<SelectMysteryResult> {
  const res = await lockDuelSpecialRound(duelId, "mystery");
  if (!res.ok) return res;
  const board = parseMysteryBoard(res.boardJson);
  if (!board) return { ok: false, error: "server_error" };
  return {
    ok: true,
    duel: res.duel,
    board,
    roundNumber: res.roundNumber,
  };
}
