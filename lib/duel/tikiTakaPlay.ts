import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { resolveDuelWinner, tallyRoundWins } from "@/lib/duel/scoring";
import { statusAfterDefendSubmit } from "@/lib/duel/fsm";
import { playerMatchesCell, toGridPlayerAttrs } from "@/lib/grid/rules";
import { GRID_SIZE, cellKey } from "@/lib/grid/types";
import {
  countOwnedCells,
  isTikiSubmitTooLate,
  parseTikiTakaBoard,
  resolveTikiTakaOutcome,
  type TikiTakaBoardJson,
  type TikiTakaMoveLog,
} from "@/lib/duel/tikiTakaTypes";
import { waitingStatusForTikiOwner } from "@/lib/duel/tikiTakaFsm";
import { quizRoundCreateData } from "@/lib/duel/createQuizRound";
import {
  listDuelEligibleCategories,
  usedCategoryIdsFromRounds,
} from "@/lib/duel/draw";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import {
  creditDuelMissions,
  creditDuelTurnMissions,
} from "@/lib/game/missionEngine";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import type { GameConfig } from "@/lib/game/economy";

export type TikiPlayError =
  | "not_found"
  | "not_your_turn"
  | "not_tiki"
  | "already_done"
  | "cell_taken"
  | "player_used"
  | "unknown_player"
  | "invalid_cell"
  | "server_error";

export type TikiPlayOk = {
  ok: true;
  duel: DuelSnapshot;
  board: TikiTakaBoardJson;
  correct: boolean;
  finished: boolean;
  missions?: EvaluateMissionsResult;
};

export type TikiPlayResult = TikiPlayOk | { ok: false; error: TikiPlayError };

type DuelLoaded = NonNullable<
  Awaited<ReturnType<typeof prisma.duelMatch.findUnique>>
> & {
  rounds: {
    id: string;
    roundNumber: number;
    attackerId: string;
    categoryId: string | null;
    attackCorrect: number;
    defenseCorrect: number;
    attackSubmittedAt: Date | null;
    defenseSubmittedAt: Date | null;
  }[];
};

/**
 * Apply one Tiki-Taka guess as `userId` (human or bot).
 * Miss / timeout → lose turn, cell stays open.
 * Correct → claim cell; then win-check or swap turnOwner.
 */
export async function executeTikiTakaGuess(input: {
  duelId: string;
  userId: string;
  row: number;
  col: number;
  playerId: string;
  timedOut?: boolean;
  /** Viewer for snapshot (defaults to userId). */
  viewerId?: string;
}): Promise<TikiPlayResult> {
  try {
    const row = Math.floor(input.row);
    const col = Math.floor(input.col);
    const playerId =
      typeof input.playerId === "string" ? input.playerId.trim() : "";
    const timedOut = Boolean(input.timedOut);
    const viewerId = input.viewerId ?? input.userId;

    if (row < 0 || col < 0 || row >= GRID_SIZE || col >= GRID_SIZE) {
      return { ok: false, error: "invalid_cell" };
    }
    // Timeout may pass without a player pick — still lose the turn.
    if (!timedOut && !playerId) {
      return { ok: false, error: "invalid_cell" };
    }

    const config = await getGameConfig();
    const duel = await prisma.duelMatch.findUnique({
      where: { id: input.duelId },
      include: duelSnapshotInclude,
    });
    if (!duel || !duel.opponentId) return { ok: false, error: "not_found" };

    const round = duel.rounds.find((r) => {
      if (r.roundType !== "TIKI_TAKA") return false;
      if (r.attackSubmittedAt && r.defenseSubmittedAt) return false;
      return true;
    });
    if (!round || round.roundType !== "TIKI_TAKA") {
      return { ok: false, error: "not_tiki" };
    }

    const board = parseTikiTakaBoard(round.boardJson);
    if (!board) return { ok: false, error: "not_found" };
    if (board.status === "COMPLETED") {
      return { ok: false, error: "already_done" };
    }
    if (board.turnOwnerId !== input.userId) {
      return { ok: false, error: "not_your_turn" };
    }

    const now = new Date();
    const turnMs = config.duel.tikiTakaTurnMs;
    let turnStartedAt = board.turnStartedAt;
    if (!turnStartedAt) turnStartedAt = now.toISOString();

    const expired =
      timedOut || isTikiSubmitTooLate(turnStartedAt, turnMs, now);

    const key = cellKey(row, col);
    const cell = board.cells[key];
    if (!cell) return { ok: false, error: "invalid_cell" };

    // On timeout without a valid open cell, just pass the turn.
    const skipCell = expired && (!cell || Boolean(cell.ownerId));
    if (!expired && cell.ownerId) {
      return { ok: false, error: "cell_taken" };
    }
    if (
      !expired &&
      playerId &&
      board.usedPlayerIds.includes(playerId)
    ) {
      return { ok: false, error: "player_used" };
    }

    let correct = false;
    if (!expired && !skipCell && playerId) {
      const guessed = await prisma.footballPlayer.findFirst({
        where: { slug: playerId, isActive: true },
      });
      if (!guessed) return { ok: false, error: "unknown_player" };
      correct = playerMatchesCell(
        toGridPlayerAttrs(guessed),
        board.axes.rows[row]!,
        board.axes.cols[col]!,
      );
    }

    const move: TikiTakaMoveLog = {
      row,
      col,
      playerId: playerId || "__timeout__",
      correct,
      timedOut: expired || undefined,
      byUserId: input.userId,
      at: now.toISOString(),
    };

    let nextBoard: TikiTakaBoardJson = {
      ...board,
      turnStartedAt,
      cells: { ...board.cells },
      usedPlayerIds: [...board.usedPlayerIds],
    };

    if (correct && !skipCell) {
      nextBoard.cells[key] = { ownerId: input.userId, playerId };
      nextBoard.usedPlayerIds = [...nextBoard.usedPlayerIds, playerId];
    }

    const outcome = resolveTikiTakaOutcome(
      nextBoard,
      duel.challengerId,
      duel.opponentId,
    );
    nextBoard = {
      ...nextBoard,
      status: outcome.status,
      winnerId: outcome.winnerId,
      winLine: outcome.winLine,
      turnStartedAt: null,
    };

    const prevLog = Array.isArray(round.attackAnswers)
      ? (round.attackAnswers as TikiTakaMoveLog[])
      : [];
    const answers = [...prevLog, move] as unknown as Prisma.InputJsonValue;

    if (outcome.status === "COMPLETED") {
      return completeTikiRound({
        duel: duel as DuelLoaded,
        round: {
          id: round.id,
          roundNumber: round.roundNumber,
          attackerId: round.attackerId,
        },
        board: nextBoard,
        answers,
        correct,
        userId: input.userId,
        viewerId,
        now,
        turnHours: config.duel.turnHours,
        winWeeklyXp: config.duel.winWeeklyXp,
        liveModes: config.liveModes,
      });
    }

    const nextOwnerId =
      input.userId === duel.challengerId
        ? duel.opponentId
        : duel.challengerId;
    nextBoard = { ...nextBoard, turnOwnerId: nextOwnerId };

    const waitStatus = waitingStatusForTikiOwner({
      roundNumber: round.roundNumber,
      nextOwnerId,
      challengerId: duel.challengerId,
      opponentId: duel.opponentId,
    });

    let botPlayAt: Date | null = null;
    if (duel.isBotOpponent && nextOwnerId === duel.opponentId) {
      const { scheduleBotPlayAt, randomBotDelayMs } = await import(
        "@/lib/duel/bot"
      );
      botPlayAt = scheduleBotPlayAt(now, await randomBotDelayMs());
    }

    await prisma.$transaction(async (tx) => {
      await tx.duelRound.update({
        where: { id: round.id },
        data: {
          boardJson: nextBoard as unknown as Prisma.InputJsonValue,
          attackAnswers: answers,
        },
      });
      await tx.duelMatch.update({
        where: { id: duel.id },
        data: {
          status: waitStatus,
          turnUserId: nextOwnerId,
          turnDeadlineAt: new Date(
            now.getTime() + config.duel.turnHours * 60 * 60 * 1000,
          ),
          botPlayAt,
        },
      });
    });

    const refreshed = await prisma.duelMatch.findUniqueOrThrow({
      where: { id: duel.id },
      include: duelSnapshotInclude,
    });

    return {
      ok: true,
      duel: toDuelSnapshot(refreshed, viewerId, {
        liveModes: config.liveModes,
      }),
      board: nextBoard,
      correct,
      finished: false,
    };
  } catch (err) {
    console.error("executeTikiTakaGuess failed", err);
    return { ok: false, error: "server_error" };
  }
}

async function completeTikiRound(opts: {
  duel: DuelLoaded;
  round: { id: string; roundNumber: number; attackerId: string };
  board: TikiTakaBoardJson;
  answers: Prisma.InputJsonValue;
  correct: boolean;
  userId: string;
  viewerId: string;
  now: Date;
  turnHours: number;
  winWeeklyXp: number;
  liveModes: GameConfig["liveModes"];
}): Promise<TikiPlayOk> {
  const opponentId = opts.duel.opponentId!;
  const challengerCells = countOwnedCells(opts.board, opts.duel.challengerId);
  const opponentCells = countOwnedCells(opts.board, opponentId);
  const attackCorrect =
    opts.round.attackerId === opts.duel.challengerId
      ? challengerCells
      : opponentCells;
  const defenseCorrect =
    opts.round.attackerId === opts.duel.challengerId
      ? opponentCells
      : challengerCells;

  const challengerDelta =
    opts.round.attackerId === opts.duel.challengerId
      ? attackCorrect
      : defenseCorrect;
  const opponentDelta =
    opts.round.attackerId === opts.duel.challengerId
      ? defenseCorrect
      : attackCorrect;

  const challengerCorrect = opts.duel.challengerCorrect + challengerDelta;
  const opponentCorrect = opts.duel.opponentCorrect + opponentDelta;
  const nextStatus = statusAfterDefendSubmit(opts.round.roundNumber);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.duelRound.update({
      where: { id: opts.round.id },
      data: {
        boardJson: opts.board as unknown as Prisma.InputJsonValue,
        attackAnswers: opts.answers,
        defenseAnswers: opts.answers,
        attackCorrect,
        defenseCorrect,
        attackSubmittedAt: opts.now,
        defenseSubmittedAt: opts.now,
      },
    });

    if (nextStatus === "B_ATTACKING" && opponentId) {
      // Bot vs human: finish bot's R2 in-session (same as QUIZ bot path).
      const quizData = await quizRoundCreateData({
        attackerId: opponentId,
        roundNumber: 2,
        excludeCategoryIds: usedCategoryIdsFromRounds(opts.duel.rounds),
      });
      await tx.duelRound.create({
        data: {
          duelId: opts.duel.id,
          roundNumber: quizData.roundNumber,
          roundType: quizData.roundType,
          attackerId: quizData.attackerId,
          draftOptionIds: quizData.draftOptionIds,
        },
      });

      let botPlayAt: Date | null = null;
      if (opts.duel.isBotOpponent) {
        const { scheduleBotPlayAt, randomBotDelayMs } = await import(
          "@/lib/duel/bot"
        );
        botPlayAt = scheduleBotPlayAt(opts.now, await randomBotDelayMs());
      }

      return tx.duelMatch.update({
        where: { id: opts.duel.id },
        data: {
          status: "B_ATTACKING",
          turnUserId: opponentId,
          turnDeadlineAt: new Date(
            opts.now.getTime() + opts.turnHours * 60 * 60 * 1000,
          ),
          botPlayAt,
          challengerCorrect,
          opponentCorrect,
        },
        include: duelSnapshotInclude,
      });
    }

    const roundWins = tallyRoundWins(
      opts.duel.rounds.map((r) => {
        const isCurrent = r.id === opts.round.id;
        return {
          attackerId: r.attackerId,
          attackCorrect: isCurrent ? attackCorrect : r.attackCorrect,
          defenseCorrect: isCurrent ? defenseCorrect : r.defenseCorrect,
          complete:
            isCurrent ||
            (Boolean(r.attackSubmittedAt) && Boolean(r.defenseSubmittedAt)),
        };
      }),
      opts.duel.challengerId,
    );
    const winnerId = resolveDuelWinner({
      challengerId: opts.duel.challengerId,
      opponentId,
      challengerCorrect,
      opponentCorrect,
      challengerRoundWins: roundWins.challenger,
      opponentRoundWins: roundWins.opponent,
    });

    let weeklyXpAwarded = opts.duel.weeklyXpAwarded;
    if (winnerId && !weeklyXpAwarded && opts.winWeeklyXp > 0) {
      await tx.user.update({
        where: { id: winnerId },
        data: { weeklyXp: { increment: opts.winWeeklyXp } },
      });
      weeklyXpAwarded = true;
    }

    return tx.duelMatch.update({
      where: { id: opts.duel.id },
      data: {
        status: "COMPLETED",
        turnUserId: null,
        turnDeadlineAt: null,
        botPlayAt: null,
        finishedAt: opts.now,
        winnerId,
        challengerCorrect,
        opponentCorrect,
        weeklyXpAwarded,
      },
      include: duelSnapshotInclude,
    });
  });

  let draftOptions = undefined;
  if (updated.status === "B_ATTACKING") {
    const r2 = updated.rounds.find((r) => r.roundNumber === 2);
    const draftIds = Array.isArray(r2?.draftOptionIds)
      ? (r2!.draftOptionIds as string[])
      : [];
    const cats = await listDuelEligibleCategories();
    draftOptions = cats.filter((c) => draftIds.includes(c.id));
  }

  const snapshot = toDuelSnapshot(updated, opts.viewerId, {
    draftOptions,
    liveModes: opts.liveModes,
  });

  let missions: EvaluateMissionsResult | undefined;
  try {
    const turnResult = await creditDuelTurnMissions({
      userId: opts.userId,
      duelId: opts.duel.id,
      roundNumber: opts.round.roundNumber,
      role: "attack",
      goals: Math.max(attackCorrect, defenseCorrect),
    });
    if (turnResult) missions = turnResult;
  } catch (err) {
    console.error("creditDuelTurnMissions after tiki", err);
  }

  if (updated.status === "COMPLETED") {
    try {
      const map = await creditDuelMissions({
        duelId: updated.id,
        challengerId: updated.challengerId,
        opponentId: updated.opponentId,
        winnerId: updated.winnerId,
      });
      missions = map.get(opts.userId) ?? missions;
    } catch (err) {
      console.error("creditDuelMissions after tiki", err);
    }
  }

  return {
    ok: true,
    duel: snapshot,
    board: opts.board,
    correct: opts.correct,
    finished: true,
    missions,
  };
}
