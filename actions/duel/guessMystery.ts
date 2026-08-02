"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { canUserAct, describeTurn } from "@/lib/duel";
import { evaluateMysteryGuess } from "@/lib/mystery/evaluate";
import { getMysteryPlayer } from "@/lib/mystery/players";
import {
  mysteryDuelScore,
  parseMysteryBoard,
  parseMysteryHalfLog,
  type MysteryHalfLog,
} from "@/lib/duel/mysteryTypes";
import {
  finalizeSpecialAttack,
  finalizeSpecialDefend,
} from "@/lib/duel/finalizeSpecialHalf";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

export type GuessMysteryResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      log: MysteryHalfLog;
      finished: boolean;
      missions?: EvaluateMissionsResult;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_your_turn"
        | "not_mystery"
        | "already_done"
        | "duplicate_guess"
        | "unknown_player"
        | "server_error";
    };

export async function guessDuelMystery(
  duelId: string,
  playerId: string,
): Promise<GuessMysteryResult> {
  void tickDuelJobs();
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const guessed = await getMysteryPlayer(playerId, prisma);
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
    if (!round || round.roundType !== "MYSTERY") {
      return { ok: false, error: "not_mystery" };
    }

    const board = parseMysteryBoard(round.boardJson);
    if (!board) return { ok: false, error: "not_found" };

    const target = await getMysteryPlayer(board.targetPlayerId, prisma);
    if (!target) return { ok: false, error: "not_found" };

    const isAttack = turn.kind === "attack";
    if (isAttack && round.attackSubmittedAt) {
      return { ok: false, error: "already_done" };
    }
    if (!isAttack && round.defenseSubmittedAt) {
      return { ok: false, error: "already_done" };
    }

    const existing =
      parseMysteryHalfLog(isAttack ? round.attackAnswers : round.defenseAnswers) ??
      ({
        guesses: [],
        status: "IN_PROGRESS",
        score: 0,
      } satisfies MysteryHalfLog);

    if (existing.status !== "IN_PROGRESS") {
      return { ok: false, error: "already_done" };
    }
    if (existing.guesses.some((g) => g.playerId === guessed.id)) {
      return { ok: false, error: "duplicate_guess" };
    }

    const now = new Date();
    const record = evaluateMysteryGuess(guessed, target, now);
    const guesses = [...existing.guesses, record];
    const correct = guessed.id === board.targetPlayerId;
    let status: MysteryHalfLog["status"] = "IN_PROGRESS";
    let score = 0;
    if (correct) {
      status = "SOLVED";
      score = mysteryDuelScore(board.maxGuesses, guesses.length, true);
    } else if (guesses.length >= board.maxGuesses) {
      status = "FAILED";
      score = 0;
    }

    const log: MysteryHalfLog = { guesses, status, score };
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
    console.error("guessDuelMystery failed", err);
    return { ok: false, error: "server_error" };
  }
}
