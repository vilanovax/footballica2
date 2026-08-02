import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { buildAutoGridAxes, loadGridPlayers } from "@/lib/grid/puzzle";
import { makeAxis } from "@/lib/grid/rules";
import { GRID_MAX_MISTAKES } from "@/lib/grid/types";
import { prisma } from "@/lib/prisma";
import type { GridBoardJson } from "@/lib/duel/gridTypes";

export type GridRoundShell = {
  roundNumber: number;
  roundType: "GRID";
  attackerId: string;
  draftOptionIds: Prisma.InputJsonValue;
  boardJson: Prisma.InputJsonValue;
  board: GridBoardJson;
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

export async function gridRoundCreateData(opts: {
  duelId: string;
  attackerId: string;
  roundNumber: number;
}): Promise<GridRoundShell> {
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

  // Nudge seed into labels so each duel feels distinct without rebuild complexity.
  void opts.duelId;
  void opts.roundNumber;

  const board: GridBoardJson = {
    kind: "GRID",
    rows: axes.rows,
    cols: axes.cols,
    maxMistakes: GRID_MAX_MISTAKES,
  };

  return {
    roundNumber: opts.roundNumber,
    roundType: "GRID",
    attackerId: opts.attackerId,
    draftOptionIds: [],
    boardJson: board as unknown as Prisma.InputJsonValue,
    board,
  };
}
