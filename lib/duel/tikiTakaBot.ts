import "server-only";

import type { BotDifficulty } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { botAccuracy } from "@/lib/bots/difficulty";
import { playerMatchesCell, toGridPlayerAttrs } from "@/lib/grid/rules";
import { GRID_SIZE, cellKey } from "@/lib/grid/types";
import type { TikiTakaBoardJson } from "@/lib/duel/tikiTakaTypes";

export type FabricatedTikiGuess = {
  row: number;
  col: number;
  playerId: string;
  /** Intentionally wrong when difficulty roll fails. */
  intendCorrect: boolean;
};

/**
 * Pick an open cell + footballer slug for a bot / shadow Tiki turn.
 * Accuracy follows botDifficulty; misses leave the cell open for the human.
 */
export async function fabricateTikiTakaGuess(
  board: TikiTakaBoardJson,
  difficulty?: BotDifficulty | null,
): Promise<FabricatedTikiGuess | null> {
  const open: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = board.cells[cellKey(r, c)];
      if (cell && !cell.ownerId) open.push({ row: r, col: c });
    }
  }
  if (open.length === 0) return null;

  const target = open[Math.floor(Math.random() * open.length)]!;
  const rowAxis = board.axes.rows[target.row]!;
  const colAxis = board.axes.cols[target.col]!;
  const used = new Set(board.usedPlayerIds);

  const players = await prisma.footballPlayer.findMany({
    where: { isActive: true },
    take: 800,
  });

  const valid = players.filter(
    (p) =>
      !used.has(p.slug) &&
      playerMatchesCell(toGridPlayerAttrs(p), rowAxis, colAxis),
  );
  const invalid = players.filter(
    (p) =>
      !used.has(p.slug) &&
      !playerMatchesCell(toGridPlayerAttrs(p), rowAxis, colAxis),
  );

  const wantHit = Math.random() < botAccuracy(difficulty);

  if (wantHit && valid.length > 0) {
    const pick = valid[Math.floor(Math.random() * valid.length)]!;
    return {
      row: target.row,
      col: target.col,
      playerId: pick.slug,
      intendCorrect: true,
    };
  }

  if (invalid.length > 0) {
    const pick = invalid[Math.floor(Math.random() * invalid.length)]!;
    return {
      row: target.row,
      col: target.col,
      playerId: pick.slug,
      intendCorrect: false,
    };
  }

  if (valid.length > 0) {
    const pick = valid[Math.floor(Math.random() * valid.length)]!;
    return {
      row: target.row,
      col: target.col,
      playerId: pick.slug,
      intendCorrect: true,
    };
  }

  return null;
}
