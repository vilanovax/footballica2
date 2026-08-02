"use server";

import { lockDuelSpecialRound } from "@/lib/duel/lockSpecialRound";
import { parseTikiTakaBoard } from "@/lib/duel/tikiTakaTypes";
import type { TikiTakaBoardJson } from "@/lib/duel/tikiTakaTypes";
import type { DuelSnapshot } from "@/lib/duel/snapshot";

export type SelectTikiTakaResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      board: TikiTakaBoardJson;
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

export async function selectDuelTikiTaka(
  duelId: string,
): Promise<SelectTikiTakaResult> {
  const res = await lockDuelSpecialRound(duelId, "tikiTaka");
  if (!res.ok) return res;
  const board = parseTikiTakaBoard(res.boardJson);
  if (!board) return { ok: false, error: "server_error" };
  return {
    ok: true,
    duel: res.duel,
    board,
    roundNumber: res.roundNumber,
  };
}
