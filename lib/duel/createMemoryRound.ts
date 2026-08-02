import "server-only";

import { buildMemoryBoard } from "@/lib/duel/memoryBoard";
import type { Prisma } from "@/generated/prisma/client";
import type { MemoryBoardJson } from "@/lib/duel/memoryTypes";

export {
  duelHasMemoryRound,
  duelHasSpecialRound,
} from "@/lib/duel/specialRounds";

export type MemoryRoundShell = {
  roundNumber: number;
  roundType: "MEMORY";
  attackerId: string;
  draftOptionIds: Prisma.InputJsonValue;
  boardJson: Prisma.InputJsonValue;
  board: MemoryBoardJson;
};

/** Shared create/convert payload for a MEMORY attack shell (human, bot, shadow). */
export async function memoryRoundCreateData(opts: {
  duelId: string;
  attackerId: string;
  pairCount: number;
  roundNumber: number;
}): Promise<MemoryRoundShell> {
  const seed = `${opts.duelId}-r${opts.roundNumber}`;
  const board = await buildMemoryBoard({
    pairCount: opts.pairCount,
    seed,
  });

  return {
    roundNumber: opts.roundNumber,
    roundType: "MEMORY",
    attackerId: opts.attackerId,
    draftOptionIds: [],
    boardJson: board as unknown as Prisma.InputJsonValue,
    board,
  };
}
