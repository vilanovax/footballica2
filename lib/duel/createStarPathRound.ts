import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildStarPathSteps } from "@/lib/starpath/path";
import { STAR_PATH_MAX_CLUES } from "@/lib/starpath/types";
import { ensureFootballPlayerCatalog } from "@/lib/mystery/players";
import { pickSlugForDateKey } from "@/lib/mystery/seedCatalog";
import type { StarPathBoardJson } from "@/lib/duel/starPathTypes";

export type StarPathRoundShell = {
  roundNumber: number;
  roundType: "STAR_PATH";
  attackerId: string;
  draftOptionIds: Prisma.InputJsonValue;
  boardJson: Prisma.InputJsonValue;
  board: StarPathBoardJson;
};

async function pickDuelStarPathTarget(
  duelId: string,
  roundNumber: number,
): Promise<{ slug: string; path: { name: string }[] }> {
  await ensureFootballPlayerCatalog(prisma);
  const rows = await prisma.footballPlayer.findMany({
    where: { isActive: true },
    select: { slug: true, club: true, pastClubs: true },
    take: 400,
  });
  const eligible = rows.filter((r) => buildStarPathSteps(r).length >= 2);
  const pool = eligible.length > 0 ? eligible : rows;
  if (pool.length === 0) {
    throw new Error("No football players for Star Path duel");
  }
  const slug = pickSlugForDateKey(
    `${duelId}-r${roundNumber}`,
    pool.map((r) => r.slug),
  );
  const player = pool.find((r) => r.slug === slug) ?? pool[0]!;
  return { slug: player.slug, path: buildStarPathSteps(player) };
}

export async function starPathRoundCreateData(opts: {
  duelId: string;
  attackerId: string;
  roundNumber: number;
}): Promise<StarPathRoundShell> {
  const picked = await pickDuelStarPathTarget(opts.duelId, opts.roundNumber);
  const board: StarPathBoardJson = {
    kind: "STAR_PATH",
    targetPlayerId: picked.slug,
    path: picked.path.slice(0, STAR_PATH_MAX_CLUES),
    maxClues: Math.min(STAR_PATH_MAX_CLUES, picked.path.length),
  };

  return {
    roundNumber: opts.roundNumber,
    roundType: "STAR_PATH",
    attackerId: opts.attackerId,
    draftOptionIds: [],
    boardJson: board as unknown as Prisma.InputJsonValue,
    board,
  };
}
