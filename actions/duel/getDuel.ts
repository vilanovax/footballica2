"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { runBotTurnIfDue } from "@/lib/duel/bot";
import {
  assignBotToMatchingDuel,
  pairOpenMatchingDuels,
  resolveAbsorbedMatchingDuel,
} from "@/lib/duel/matchmaking";
import { expireDuelIfDue } from "@/lib/duel/expire";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";
import { listDuelEligibleCategories } from "@/lib/duel/draw";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion } from "@/lib/quiz/types";
import { describeTurn } from "@/lib/duel";
import { beginDuelDefend } from "@/actions/duel/submitDefend";
import { beginMemoryTurn } from "@/actions/duel/beginMemoryTurn";
import { beginTikiTakaTurn } from "@/actions/duel/tikitaka/beginTikiTakaTurn";
import type { MemoryBoardJson } from "@/lib/duel/memoryTypes";
import { getGameConfig } from "@/lib/game/gameConfig";
import { isSpecialDuelRoundType } from "@/lib/game/liveModes";

export type GetDuelResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      /** Questions for the active QUIZ turn when already locked / defending. */
      questions: QuizQuestion[] | null;
      /** MEMORY board when the active turn is a memory half. */
      memoryBoard?: MemoryBoardJson | null;
      memoryEndsAt?: string | null;
      memoryRevealMs?: number | null;
    }
  | { ok: false; error: "not_authenticated" | "not_found" | "forbidden" | "server_error" };

/**
 * Load one duel for the detail screen. Runs duel jobs + this-row bot/expire.
 * If the viewer should defend (WAITING_*), opens that turn and returns questions
 * so the arena can jump straight into play — no client bootstrap race.
 */
export async function getDuel(duelId: string): Promise<GetDuelResult> {
  try {
    await tickDuelJobs();
    await pairOpenMatchingDuels(10);
    await assignBotToMatchingDuel(duelId);
    await runBotTurnIfDue(duelId);
    await expireDuelIfDue(duelId);
  } catch (err) {
    console.error("duel tick in getDuel", err);
  }

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const redirectedId = await resolveAbsorbedMatchingDuel({
      duelId,
      userId: user.id,
    });
    const loadId = redirectedId ?? duelId;

    let duel = await prisma.duelMatch.findUnique({
      where: { id: loadId },
      include: duelSnapshotInclude,
    });
    if (!duel) return { ok: false, error: "not_found" };

    const isParty =
      duel.challengerId === user.id || duel.opponentId === user.id;
    if (!isParty) return { ok: false, error: "forbidden" };

    // Auto-claim defend so "Your turn" opens the quiz / memory immediately.
    const shouldOpenDefend =
      (duel.status === "WAITING_A" && duel.challengerId === user.id) ||
      (duel.status === "WAITING_B" && duel.opponentId === user.id) ||
      ((duel.status === "A_DEFENDING" || duel.status === "B_DEFENDING") &&
        duel.turnUserId === user.id);

    const turnPreview = describeTurn(duel.status);
    const previewRound =
      turnPreview.roundNumber != null
        ? duel.rounds.find((r) => r.roundNumber === turnPreview.roundNumber)
        : null;

    if (
      (duel.status === "WAITING_A" && duel.challengerId === user.id) ||
      (duel.status === "WAITING_B" && duel.opponentId === user.id)
    ) {
      if (previewRound?.roundType === "MEMORY") {
        const opened = await beginMemoryTurn(loadId);
        if (opened.ok) {
          return {
            ok: true,
            duel: opened.duel,
            questions: null,
            memoryBoard: opened.board,
            memoryEndsAt: opened.endsAt,
            memoryRevealMs: opened.revealMs,
          };
        }
      } else if (previewRound?.roundType === "TIKI_TAKA") {
        const opened = await beginTikiTakaTurn(loadId);
        if (opened.ok) {
          return {
            ok: true,
            duel: opened.duel,
            questions: null,
          };
        }
      } else if (
        previewRound &&
        isSpecialDuelRoundType(previewRound.roundType)
      ) {
        // Guess-based specials don't need a QUIZ defend bootstrap.
      } else {
        const opened = await beginDuelDefend(loadId);
        if (opened.ok) {
          return {
            ok: true,
            duel: opened.duel,
            questions: opened.questions,
          };
        }
      }
      // Fall through to a plain snapshot if claim raced / failed.
      duel = await prisma.duelMatch.findUnique({
        where: { id: loadId },
        include: duelSnapshotInclude,
      });
      if (!duel) return { ok: false, error: "not_found" };
    }

    // MEMORY attack: stamp clock when the attacker opens the duel.
    const turnAfter = describeTurn(duel.status);
    const activeAfter =
      turnAfter.roundNumber != null
        ? duel.rounds.find((r) => r.roundNumber === turnAfter.roundNumber)
        : null;
    if (
      activeAfter?.roundType === "MEMORY" &&
      turnAfter.kind === "attack" &&
      duel.turnUserId === user.id &&
      !activeAfter.attackSubmittedAt
    ) {
      const opened = await beginMemoryTurn(loadId);
      if (opened.ok) {
        return {
          ok: true,
          duel: opened.duel,
          questions: null,
          memoryBoard: opened.board,
          memoryEndsAt: opened.endsAt,
          memoryRevealMs: opened.revealMs,
        };
      }
    }

    if (
      activeAfter?.roundType === "MEMORY" &&
      (turnAfter.kind === "defend" || shouldOpenDefend) &&
      duel.turnUserId === user.id &&
      !activeAfter.defenseSubmittedAt
    ) {
      const opened = await beginMemoryTurn(loadId);
      if (opened.ok) {
        return {
          ok: true,
          duel: opened.duel,
          questions: null,
          memoryBoard: opened.board,
          memoryEndsAt: opened.endsAt,
          memoryRevealMs: opened.revealMs,
        };
      }
    }

    if (
      activeAfter?.roundType === "TIKI_TAKA" &&
      duel.turnUserId === user.id &&
      !(activeAfter.attackSubmittedAt && activeAfter.defenseSubmittedAt)
    ) {
      const opened = await beginTikiTakaTurn(loadId);
      if (opened.ok) {
        return {
          ok: true,
          duel: opened.duel,
          questions: null,
        };
      }
    }

    const [cats, config] = await Promise.all([
      listDuelEligibleCategories(),
      getGameConfig(),
    ]);
    const turn = describeTurn(duel.status);
    const activeRound =
      turn.roundNumber != null
        ? duel.rounds.find((r) => r.roundNumber === turn.roundNumber)
        : null;
    const draftIds = Array.isArray(activeRound?.draftOptionIds)
      ? (activeRound!.draftOptionIds as string[])
      : [];
    const isSpecial =
      activeRound != null && isSpecialDuelRoundType(activeRound.roundType);
    const draftOptions =
      turn.kind === "attack" && !isSpecial
        ? cats.filter((c) => draftIds.includes(c.id))
        : undefined;

    let questions: QuizQuestion[] | null = null;
    if (
      activeRound?.roundType === "QUIZ" &&
      activeRound?.questionIds &&
      Array.isArray(activeRound.questionIds) &&
      (turn.kind === "attack" || turn.kind === "defend" || shouldOpenDefend)
    ) {
      const ids = activeRound.questionIds as string[];
      const rows = await prisma.question.findMany({
        where: { id: { in: ids } },
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      questions = ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r) => dbQuestionToQuiz(r!));
    }

    return {
      ok: true,
      duel: toDuelSnapshot(duel, user.id, {
        draftOptions,
        liveModes: config.liveModes,
      }),
      questions,
      memoryBoard:
        activeRound?.roundType === "MEMORY"
          ? ((activeRound.boardJson as MemoryBoardJson | null) ?? null)
          : null,
    };
  } catch (err) {
    console.error("getDuel failed", err);
    return { ok: false, error: "server_error" };
  }
}
