import "server-only";

import { buildMemoryBoard } from "@/lib/duel/memoryBoard";
import type { Prisma } from "@/generated/prisma/client";
import type { MemoryBoardJson } from "@/lib/duel/memoryTypes";

export type MemoryRoundShell = {
  roundNumber: 2;
  roundType: "MEMORY";
  attackerId: string;
  draftOptionIds: Prisma.InputJsonValue;
  boardJson: Prisma.InputJsonValue;
  board: MemoryBoardJson;
};

/** Shared create payload for round-2 MEMORY shells (human, bot, shadow). */
export async function memoryRoundCreateData(opts: {
  duelId: string;
  attackerId: string;
  pairCount: number;
}): Promise<MemoryRoundShell> {
  const seed = `${opts.duelId}-r2`;
  const board = await buildMemoryBoard({
    pairCount: opts.pairCount,
    seed,
  });

  return {
    roundNumber: 2,
    roundType: "MEMORY",
    attackerId: opts.attackerId,
    draftOptionIds: [],
    boardJson: board as unknown as Prisma.InputJsonValue,
    board,
  };
}
