"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { canUserAct, describeTurn } from "@/lib/duel";
import { playerMatchesCell, toGridPlayerAttrs } from "@/lib/grid/rules";
import { GRID_SIZE, cellKey } from "@/lib/grid/types";
import {
  countFilledCells,
  parseGridBoard,
  parseGridHalfLog,
  type GridHalfLog,
} from "@/lib/duel/gridTypes";
import {
  finalizeSpecialAttack,
  finalizeSpecialDefend,
} from "@/lib/duel/finalizeSpecialHalf";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

export type GuessGridResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      log: GridHalfLog;
      finished: boolean;
      missions?: EvaluateMissionsResult;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "not_grid"
        | "already_done"
        | "cell_taken"
        | "unknown_player"
        | "invalid_cell"
        | "server_error";
    };

export async function guessDuelGrid(input: {
  duelId: string;
  playerId: string;
  row: number;
  col: number;
}): Promise<GuessGridResult> {
  void tickDuelJobs();
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const { duelId, playerId, row, col } = input;
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      col < 0 ||
      row >= GRID_SIZE ||
      col >= GRID_SIZE
    ) {
      return { ok: false, error: "invalid_cell" };
    }

    const guessed = await prisma.footballPlayer.findFirst({
      where: { slug: playerId, isActive: true },
    });
    if (!guessed) return { ok: false, error: "unknown_player" };

    const duel = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: duelSnapshotInclude,
    });
    if (!duel) return { ok: false, error: "not_found" };
    if (duel.timeoutUserId === user.id) {
      return { ok: false, error: "not_your_turn" };
    }
    if (
      !canUserAct({
        status: duel.status,
        userId: user.id,
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
      })
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const turn = describeTurn(duel.status);
    if (
      (turn.kind !== "attack" && turn.kind !== "defend") ||
      turn.roundNumber == null
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const round = duel.rounds.find((r) => r.roundNumber === turn.roundNumber);
    if (!round || round.roundType !== "GRID") {
      return { ok: false, error: "not_grid" };
    }

    const board = parseGridBoard(round.boardJson);
    if (!board) return { ok: false, error: "not_found" };

    const isAttack = turn.kind === "attack";
    if (isAttack && round.attackSubmittedAt) {
      return { ok: false, error: "already_done" };
    }
    if (!isAttack && round.defenseSubmittedAt) {
      return { ok: false, error: "already_done" };
    }

    const existing =
      parseGridHalfLog(isAttack ? round.attackAnswers : round.defenseAnswers) ??
      ({
        cells: {},
        wrongGuesses: [],
        status: "IN_PROGRESS",
        score: 0,
      } satisfies GridHalfLog);

    if (existing.status !== "IN_PROGRESS") {
      return { ok: false, error: "already_done" };
    }

    const key = cellKey(row, col);
    if (existing.cells[key]) {
      return { ok: false, error: "cell_taken" };
    }

    const attrs = toGridPlayerAttrs(guessed);
    const rowAxis = board.rows[row]!;
    const colAxis = board.cols[col]!;
    const matches = playerMatchesCell(attrs, rowAxis, colAxis);
    const now = new Date();

    let cells = { ...existing.cells };
    let wrongGuesses = [...existing.wrongGuesses];
    let status: GridHalfLog["status"] = "IN_PROGRESS";

    if (matches) {
      cells = {
        ...cells,
        [key]: {
          playerId: guessed.slug,
          nameEn: guessed.nameEn,
          nameFa: guessed.nameFa,
        },
      };
    } else {
      wrongGuesses = [
        ...wrongGuesses,
        { playerId: guessed.slug, row, col, at: now.toISOString() },
      ];
    }

    const filled = countFilledCells(cells);
    const mistakes = wrongGuesses.length;
    if (filled >= GRID_SIZE * GRID_SIZE) {
      status = "SOLVED";
    } else if (mistakes >= board.maxMistakes) {
      status = "FAILED";
    }

    const score = filled;
    const log: GridHalfLog = { cells, wrongGuesses, status, score };
    const answers = log as unknown as Prisma.InputJsonValue;

    if (status === "IN_PROGRESS") {
      await prisma.duelRound.update({
        where: { id: round.id },
        data: isAttack
          ? { attackAnswers: answers }
          : { defenseAnswers: answers },
      });
      const refreshed = await prisma.duelMatch.findUniqueOrThrow({
        where: { id: duel.id },
        include: duelSnapshotInclude,
      });
      return {
        ok: true,
        duel: toDuelSnapshot(refreshed, user.id),
        log,
        finished: false,
      };
    }

    const duelLite = {
      id: duel.id,
      challengerId: duel.challengerId,
      opponentId: duel.opponentId,
      challengerCorrect: duel.challengerCorrect,
      opponentCorrect: duel.opponentCorrect,
      isBotOpponent: duel.isBotOpponent,
      botPlayAt: duel.botPlayAt,
      weeklyXpAwarded: duel.weeklyXpAwarded,
      rounds: duel.rounds,
    };

    const fin = isAttack
      ? await finalizeSpecialAttack({
          duel: duelLite,
          round,
          userId: user.id,
          score,
          answers,
          now,
        })
      : await finalizeSpecialDefend({
          duel: duelLite,
          round,
          userId: user.id,
          score,
          answers,
          now,
        });

    return {
      ok: true,
      duel: fin.duel,
      log,
      finished: true,
      missions: fin.missions,
    };
  } catch (err) {
    console.error("guessDuelGrid failed", err);
    return { ok: false, error: "server_error" };
  }
}
