"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import {
  ensureTodayGridPuzzle,
  maxMistakesFromConfig,
} from "@/lib/grid/puzzle";
import {
  filledCount,
  parseCellsJson,
  parseGridAxes,
  parseGuessesJson,
} from "@/lib/grid/parse";
import { playerMatchesCell } from "@/lib/grid/rules";
import { buildGridShareCode } from "@/lib/grid/share";
import { computeGridStreakUpdate } from "@/lib/grid/streak";
import { cellKey, GRID_SIZE } from "@/lib/grid/types";
import type { DailyGridSnapshot } from "./getDailyGrid";
import { listMysteryOptions } from "@/lib/mystery/players";

export type SubmitGridGuessResult =
  | { ok: true; grid: DailyGridSnapshot; correct: boolean }
  | { ok: false; error: string };

export async function submitGridGuess(input: {
  row: number;
  col: number;
  playerId: string;
}): Promise<SubmitGridGuessResult> {
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };

  const row = Math.floor(input.row);
  const col = Math.floor(input.col);
  const playerId =
    typeof input.playerId === "string" ? input.playerId.trim() : "";
  if (
    !playerId ||
    row < 0 ||
    col < 0 ||
    row >= GRID_SIZE ||
    col >= GRID_SIZE
  ) {
    return { ok: false, error: "invalid_input" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const club = await tx.club.findUniqueOrThrow({
      where: { id: pair.club.id },
    });
    const puzzle = await ensureTodayGridPuzzle(tx);
    const rows = parseGridAxes(puzzle.rowsJson);
    const cols = parseGridAxes(puzzle.colsJson);
    if (!rows || !cols) return { error: "invalid_puzzle" as const };

    const attempt = await tx.dailyGridAttempt.upsert({
      where: {
        clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
      },
      create: { clubId: club.id, puzzleId: puzzle.id },
      update: {},
    });

    if (attempt.status !== "IN_PROGRESS") {
      return { error: "already_done" as const };
    }

    const cells = parseCellsJson(attempt.cellsJson);
    const key = cellKey(row, col);
    if (cells[key]) return { error: "cell_filled" as const };

    const used = new Set(
      Object.values(cells)
        .map((c) => c?.playerId)
        .filter(Boolean),
    );
    if (used.has(playerId)) return { error: "duplicate_player" as const };

    const player = await tx.footballPlayer.findFirst({
      where: { slug: playerId, isActive: true },
    });
    if (!player) return { error: "unknown_player" as const };

    const maxMistakes = maxMistakesFromConfig(puzzle.config);
    const matches = playerMatchesCell(
      {
        league: player.league,
        position: player.position,
        nationalityCode: player.nationalityCode,
        club: player.club,
      },
      rows[row]!,
      cols[col]!,
    );

    const guesses = parseGuessesJson(attempt.guessesJson);
    let mistakeCount = attempt.mistakeCount;
    let status: "IN_PROGRESS" | "SOLVED" | "FAILED" = attempt.status;
    let shareCode = attempt.shareCode;
    let solvedAt = attempt.solvedAt;
    let gridStreak = club.gridStreak;
    let correct = false;

    if (matches) {
      correct = true;
      cells[key] = {
        playerId: player.slug,
        nameEn: player.nameEn,
        nameFa: player.nameFa,
      };
      const filled = filledCount(cells);
      if (filled >= GRID_SIZE * GRID_SIZE) {
        status = "SOLVED";
        solvedAt = new Date();
        shareCode = buildGridShareCode(cells);
        const streak = computeGridStreakUpdate({
          gridStreak: club.gridStreak,
          longestGridStreak: club.longestGridStreak,
          lastGridDate: club.lastGridDate,
        });
        gridStreak = streak.gridStreak;
        await tx.club.update({
          where: { id: club.id },
          data: {
            gridStreak: streak.gridStreak,
            longestGridStreak: streak.longestGridStreak,
            lastGridDate: streak.lastGridDate,
            gridSolves: { increment: streak.isNewDay ? 1 : 0 },
          },
        });
      }
    } else {
      mistakeCount += 1;
      guesses.push({
        playerId: player.slug,
        row,
        col,
        at: new Date().toISOString(),
      });
      if (mistakeCount >= maxMistakes) {
        status = "FAILED";
        shareCode = buildGridShareCode(cells);
      }
    }

    const updated = await tx.dailyGridAttempt.update({
      where: { id: attempt.id },
      data: {
        cellsJson: cells,
        guessesJson: guesses,
        mistakeCount,
        status,
        shareCode,
        solvedAt,
      },
    });

    const options = await listMysteryOptions(tx);
    return {
      correct,
      grid: {
        dateKey: puzzle.dateKey,
        status: updated.status,
        rows,
        cols,
        cells,
        mistakeCount: updated.mistakeCount,
        maxMistakes,
        filled: filledCount(cells),
        totalCells: GRID_SIZE * GRID_SIZE,
        shareCode: updated.shareCode,
        gridStreak,
        options,
      } satisfies DailyGridSnapshot,
    };
  });

    if ("error" in result && result.error) {
    return { ok: false, error: result.error };
  }
  if (!("grid" in result) || !result.grid) {
    return { ok: false, error: "err_generic" };
  }

  revalidatePath("/play");
  revalidatePath("/play/grid");
  revalidatePath("/club");
  return { ok: true, grid: result.grid, correct: Boolean(result.correct) };
}
