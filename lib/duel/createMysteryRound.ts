import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MYSTERY_MAX_GUESSES } from "@/lib/mystery/types";
import { ensureFootballPlayerCatalog } from "@/lib/mystery/players";
import { pickSlugForDateKey } from "@/lib/mystery/seedCatalog";
import type { MysteryBoardJson } from "@/lib/duel/mysteryTypes";

export type MysteryRoundShell = {
  roundNumber: number;
  roundType: "MYSTERY";
  attackerId: string;
  draftOptionIds: Prisma.InputJsonValue;
  boardJson: Prisma.InputJsonValue;
  board: MysteryBoardJson;
};

export async function mysteryRoundCreateData(opts: {
  duelId: string;
  attackerId: string;
  roundNumber: number;
  maxGuesses?: number;
}): Promise<MysteryRoundShell> {
  await ensureFootballPlayerCatalog(prisma);
  const rows = await prisma.footballPlayer.findMany({
    where: { isActive: true },
    select: { slug: true },
    take: 400,
  });
  if (rows.length === 0) {
    throw new Error("No football players for Mystery duel");
  }
  const slug = pickSlugForDateKey(
    `${opts.duelId}-mystery-r${opts.roundNumber}`,
    rows.map((r) => r.slug),
  );
  const board: MysteryBoardJson = {
    kind: "MYSTERY",
    targetPlayerId: slug,
    maxGuesses: opts.maxGuesses ?? MYSTERY_MAX_GUESSES,
  };

  return {
    roundNumber: opts.roundNumber,
    roundType: "MYSTERY",
    attackerId: opts.attackerId,
    draftOptionIds: [],
    boardJson: board as unknown as Prisma.InputJsonValue,
    board,
  };
}
