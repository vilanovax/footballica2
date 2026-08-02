import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { buildAutoGridAxes, loadGridPlayers } from "@/lib/grid/puzzle";
import { makeAxis } from "@/lib/grid/rules";
import { prisma } from "@/lib/prisma";
import {
  emptyTikiCells,
  type TikiTakaBoardJson,
} from "@/lib/duel/tikiTakaTypes";

export type TikiTakaRoundShell = {
  roundNumber: number;
  roundType: "TIKI_TAKA";
  attackerId: string;
  draftOptionIds: Prisma.InputJsonValue;
  boardJson: Prisma.InputJsonValue;
  board: TikiTakaBoardJson;
};

function topValues(values: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const t = v.trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v]) => v);
}

export async function tikiTakaRoundCreateData(opts: {
  duelId: string;
  attackerId: string;
  roundNumber: number;
}): Promise<TikiTakaRoundShell> {
  const players = await loadGridPlayers(prisma);
  const built = buildAutoGridAxes(players);
  const axes =
    built ??
    (() => {
      const leagues = topValues(
        players.map((p) => p.league),
        3,
      );
      while (leagues.length < 3) leagues.push(`League ${leagues.length + 1}`);
      return {
        rows: leagues
          .slice(0, 3)
          .map((v, i) => makeAxis(`r${i}`, "league", v)),
        cols: ["FWD", "MID", "DEF"].map((v, i) =>
          makeAxis(`c${i}`, "position", v),
        ),
      };
    })();

  void opts.duelId;

  const board: TikiTakaBoardJson = {
    kind: "TIKI_TAKA",
    axes: { rows: axes.rows, cols: axes.cols },
    cells: emptyTikiCells(),
    usedPlayerIds: [],
    turnOwnerId: opts.attackerId,
    turnStartedAt: null,
    status: "IN_PROGRESS",
    winnerId: null,
    winLine: null,
  };

  return {
    roundNumber: opts.roundNumber,
    roundType: "TIKI_TAKA",
    attackerId: opts.attackerId,
    draftOptionIds: [],
    boardJson: board as unknown as Prisma.InputJsonValue,
    board,
  };
}
