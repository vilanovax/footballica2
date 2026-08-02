"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { canUserAct, describeTurn } from "@/lib/duel";
import { getMysteryPlayer } from "@/lib/mystery/players";
import { scoreForCluesRevealed } from "@/lib/starpath/types";
import {
  parseStarPathBoard,
  parseStarPathHalfLog,
  type StarPathHalfLog,
} from "@/lib/duel/starPathTypes";
import {
  finalizeSpecialAttack,
  finalizeSpecialDefend,
} from "@/lib/duel/finalizeSpecialHalf";
import { tickDuelJobs } from "@/lib/duel/jobs";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import type { StarPathGuessRecord } from "@/lib/starpath/types";

export type GuessStarPathResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      log: StarPathHalfLog;
      finished: boolean;
      missions?: EvaluateMissionsResult;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "not_star_path"
        | "already_done"
        | "duplicate_guess"
        | "unknown_player"
        | "server_error";
    };

export async function guessDuelStarPath(
  duelId: string,
  playerId: string,
): Promise<GuessStarPathResult> {
  void tickDuelJobs();
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const guessed = await getMysteryPlayer(playerId, prisma);
    if (!guessed) return { ok: false, error: "unknown_player" };

    const duel = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: {
        rounds: { include: { category: true }, orderBy: { roundNumber: "asc" } },
      },
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
    if (!round || round.roundType !== "STAR_PATH") {
      return { ok: false, error: "not_star_path" };
    }

    const board = parseStarPathBoard(round.boardJson);
    if (!board) return { ok: false, error: "not_found" };

    const isAttack = turn.kind === "attack";
    if (isAttack && round.attackSubmittedAt) {
      return { ok: false, error: "already_done" };
    }
    if (!isAttack && round.defenseSubmittedAt) {
      return { ok: false, error: "already_done" };
    }

    const existingRaw = isAttack ? round.attackAnswers : round.defenseAnswers;
    const existing =
      parseStarPathHalfLog(existingRaw) ??
      ({
        guesses: [],
        cluesRevealed: 1,
        status: "IN_PROGRESS",
        score: 0,
      } satisfies StarPathHalfLog);

    if (existing.status !== "IN_PROGRESS") {
      return { ok: false, error: "already_done" };
    }
    if (existing.guesses.some((g) => g.playerId === guessed.id)) {
      return { ok: false, error: "duplicate_guess" };
    }

    const now = new Date();
    const correct = guessed.id === board.targetPlayerId;
    const row: StarPathGuessRecord = {
      playerId: guessed.id,
      correct,
      at: now.toISOString(),
    };
    let cluesRevealed = existing.cluesRevealed;
    let status: StarPathHalfLog["status"] = "IN_PROGRESS";
    let score = 0;

    if (correct) {
      status = "SOLVED";
      score = scoreForCluesRevealed(cluesRevealed);
    } else if (cluesRevealed >= board.maxClues) {
      status = "FAILED";
      score = 0;
    } else {
      cluesRevealed += 1;
    }

    const log: StarPathHalfLog = {
      guesses: [...existing.guesses, row],
      cluesRevealed,
      status,
      score,
    };
    const answers = log as unknown as Prisma.InputJsonValue;

    if (status === "IN_PROGRESS") {
      await prisma.duelRound.update({
        where: { id: round.id },
        data: isAttack
          ? { attackAnswers: answers }
          : { defenseAnswers: answers },
      });
      const { duelSnapshotInclude } = await import("@/lib/duel/include");
      const { toDuelSnapshot } = await import("@/lib/duel/snapshot");
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

    if (isAttack) {
      const fin = await finalizeSpecialAttack({
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
    }

    const fin = await finalizeSpecialDefend({
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
    console.error("guessDuelStarPath failed", err);
    return { ok: false, error: "server_error" };
  }
}
