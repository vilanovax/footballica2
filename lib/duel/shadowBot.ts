import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  BotDifficulty,
  DuelMatch,
  DuelRound,
  DuelStatus,
} from "@/generated/prisma/client";
import { getGameConfig } from "@/lib/game/gameConfig";
import {
  drawCategoryQuestions,
  pickDraftCategories,
  usedCategoryIdsFromRounds,
} from "@/lib/duel/draw";
import { fabricateBotAnswers } from "@/lib/duel/bot";
import { gradeDuelAnswers } from "@/lib/duel/grade";
import {
  countCorrect,
  resolveDuelWinner,
  statusAfterAttackSubmit,
  statusAfterDefendSubmit,
  tallyRoundWins,
} from "@/lib/duel";
import { creditDuelMissions } from "@/lib/game/missionEngine";
import {
  duelHasMemoryRound,
  memoryRoundCreateData,
} from "@/lib/duel/createMemoryRound";
import { quizRoundCreateData } from "@/lib/duel/createQuizRound";
import { parseMemoryBoard } from "@/lib/duel/memoryBoard";
import { fabricateBotMemoryLog } from "@/lib/duel/memoryBot";

type DuelWithRounds = DuelMatch & { rounds: DuelRound[] };

/**
 * Shadow Bot — when a human AFKs, fabricate their remaining turns so the
 * active player can finish. The AFK user keeps their name/avatar (illusion);
 * they only see a timeout loss and never learn a bot filled in.
 */
export async function runShadowBotTakeover(
  duelId: string,
  timeoutUserId: string,
  now = new Date(),
): Promise<boolean> {
  const duel = await prisma.duelMatch.findUnique({
    where: { id: duelId },
    include: { rounds: { orderBy: { roundNumber: "asc" } } },
  });
  if (!duel || !duel.opponentId) return false;

  // Mark takeover (idempotent).
  if (!duel.shadowBotActive || duel.timeoutUserId !== timeoutUserId) {
    await prisma.duelMatch.update({
      where: { id: duelId },
      data: {
        shadowBotActive: true,
        timeoutUserId,
      },
    });
  }

  const afkUser = await prisma.user.findUnique({
    where: { id: timeoutUserId },
    select: { botDifficulty: true },
  });
  const difficulty: BotDifficulty = afkUser?.botDifficulty ?? "MEDIUM";

  // Play until the AFK player is no longer on turn (or match ends).
  for (let step = 0; step < 6; step++) {
    const fresh = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
    });
    if (!fresh) return false;
    if (
      fresh.status === "COMPLETED" ||
      fresh.status === "FORFEIT" ||
      fresh.status === "EXPIRED"
    ) {
      return true;
    }
    if (fresh.turnUserId !== timeoutUserId) {
      // Active player's turn — stop; they continue normally.
      return true;
    }

    const played = await playOneShadowTurn(fresh, timeoutUserId, difficulty, now);
    if (!played) return false;
  }
  return true;
}

async function playOneShadowTurn(
  duel: DuelWithRounds,
  actorId: string,
  difficulty: BotDifficulty,
  now: Date,
): Promise<boolean> {
  const config = await getGameConfig();
  const status = duel.status as DuelStatus;

  // Claim WAITING → DEFENDING
  if (status === "WAITING_B" || status === "WAITING_A") {
    const next = status === "WAITING_B" ? "B_DEFENDING" : "A_DEFENDING";
    await prisma.duelMatch.update({
      where: { id: duel.id },
      data: { status: next, turnUserId: actorId },
    });
    return playDefendTurn(
      { ...duel, status: next },
      actorId,
      difficulty,
      now,
      config.duel.turnHours,
    );
  }

  if (status === "B_DEFENDING" || status === "A_DEFENDING") {
    return playDefendTurn(duel, actorId, difficulty, now, config.duel.turnHours);
  }

  if (status === "A_ATTACKING" || status === "B_ATTACKING") {
    return playAttackTurn(duel, actorId, difficulty, now, config.duel);
  }

  return false;
}

async function playDefendTurn(
  duel: DuelWithRounds,
  actorId: string,
  difficulty: BotDifficulty,
  now: Date,
  turnHours: number,
): Promise<boolean> {
  const roundNumber = duel.status === "A_DEFENDING" ? 2 : 1;
  const round = duel.rounds.find((r) => r.roundNumber === roundNumber);
  if (!round || round.defenseSubmittedAt) return false;

  let defenseLog: unknown;
  let defenseCorrect: number;

  if (round.roundType === "MEMORY") {
    const board = parseMemoryBoard(round.boardJson);
    if (!board) return false;
    const mem = fabricateBotMemoryLog(board, difficulty);
    defenseLog = mem;
    defenseCorrect = mem.pairsFound;
  } else {
    if (!round.questionIds || !Array.isArray(round.questionIds)) return false;
    const qIds = round.questionIds as string[];
    defenseLog = await fabricateBotAnswers(qIds, difficulty);
    defenseCorrect = countCorrect(defenseLog as Awaited<ReturnType<typeof fabricateBotAnswers>>);
  }

  const nextStatus = statusAfterDefendSubmit(roundNumber);

  const isChallenger = actorId === duel.challengerId;
  let challengerCorrect =
    duel.challengerCorrect + (isChallenger ? defenseCorrect : 0);
  let opponentCorrect =
    duel.opponentCorrect + (!isChallenger ? defenseCorrect : 0);

  if (nextStatus === "B_ATTACKING") {
    // Round 2 QUIZ draft — attacker may still lock Memory if unused.
    const quizData = await quizRoundCreateData({
      attackerId: duel.opponentId!,
      roundNumber: 2,
      excludeCategoryIds: usedCategoryIdsFromRounds(duel.rounds),
    });
    await prisma.$transaction(async (tx) => {
      await tx.duelRound.update({
        where: { id: round.id },
        data: {
          defenseAnswers: defenseLog as object,
          defenseCorrect,
          defenseSubmittedAt: now,
        },
      });
      await tx.duelRound.create({
        data: {
          duelId: duel.id,
          roundNumber: quizData.roundNumber,
          roundType: quizData.roundType,
          attackerId: quizData.attackerId,
          draftOptionIds: quizData.draftOptionIds,
        },
      });
      await tx.duelMatch.update({
        where: { id: duel.id },
        data: {
          status: "B_ATTACKING",
          turnUserId: duel.opponentId,
          turnDeadlineAt: new Date(
            now.getTime() + turnHours * 60 * 60 * 1000,
          ),
          botPlayAt: null,
          challengerCorrect,
          opponentCorrect,
        },
      });
    });
    return true;
  }

  // Round 2 defend → COMPLETED. Penalize timeout user as loser.
  const roundsForTally = duel.rounds.map((r) => ({
    attackerId: r.attackerId,
    attackCorrect: r.attackCorrect,
    defenseCorrect:
      r.id === round.id ? defenseCorrect : r.defenseCorrect,
    complete:
      Boolean(r.attackSubmittedAt) &&
      (r.id === round.id || Boolean(r.defenseSubmittedAt)),
  }));
  // Ensure r1 complete in tally
  const tally = tallyRoundWins(roundsForTally, duel.challengerId);
  let winnerId = resolveDuelWinner({
    challengerId: duel.challengerId,
    opponentId: duel.opponentId,
    challengerCorrect,
    opponentCorrect,
    challengerRoundWins: tally.challenger,
    opponentRoundWins: tally.opponent,
  });
  if (duel.timeoutUserId || actorId) {
    const afk = duel.timeoutUserId ?? actorId;
    winnerId =
      afk === duel.challengerId ? duel.opponentId : duel.challengerId;
  }

  let weeklyXpAwarded = duel.weeklyXpAwarded;
  const config = await getGameConfig();
  if (winnerId && !weeklyXpAwarded && config.duel.winWeeklyXp > 0) {
    await prisma.user.update({
      where: { id: winnerId },
      data: { weeklyXp: { increment: config.duel.winWeeklyXp } },
    });
    weeklyXpAwarded = true;
  }

  await prisma.$transaction(async (tx) => {
    await tx.duelRound.update({
      where: { id: round.id },
      data: {
        defenseAnswers: defenseLog as object,
        defenseCorrect,
        defenseSubmittedAt: now,
        defenseStartedAt: now,
      },
    });
    await tx.duelMatch.update({
      where: { id: duel.id },
      data: {
        status: "COMPLETED",
        turnUserId: null,
        turnDeadlineAt: null,
        botPlayAt: null,
        finishedAt: now,
        winnerId,
        weeklyXpAwarded,
        challengerCorrect,
        opponentCorrect,
      },
    });
  });

  try {
    await creditDuelMissions({
      duelId: duel.id,
      challengerId: duel.challengerId,
      opponentId: duel.opponentId,
      winnerId,
    });
  } catch (err) {
    console.error("creditDuelMissions after shadow complete", err);
  }
  return true;
}

async function playAttackTurn(
  duel: DuelWithRounds,
  actorId: string,
  difficulty: BotDifficulty,
  now: Date,
  duelCfg: {
    questionsPerAttack: number;
    draftChoices: number;
    turnHours: number;
    memoryPairs: number;
  },
): Promise<boolean> {
  const roundNumber = duel.status === "A_ATTACKING" ? 1 : 2;
  let round = duel.rounds.find((r) => r.roundNumber === roundNumber);

  // Round 1 may need a fresh round row with draft options.
  if (!round && roundNumber === 1) {
    const draft = await pickDraftCategories(duelCfg.draftChoices, []);
    round = await prisma.duelRound.create({
      data: {
        duelId: duel.id,
        roundNumber: 1,
        roundType: "QUIZ",
        attackerId: duel.challengerId,
        draftOptionIds: draft.map((c) => c.id),
      },
    });
  }
  if (!round) return false;
  if (round.attackSubmittedAt) return false;

  const memoryAvailable =
    !duelHasMemoryRound(duel.rounds.filter((r) => r.id !== round.id)) &&
    round.roundType !== "MEMORY";

  // Prefer Memory when still available (keeps old R2 flavor if R1 was quiz).
  const playMemory =
    round.roundType === "MEMORY" || (memoryAvailable && roundNumber === 2);

  if (playMemory) {
    let board = parseMemoryBoard(round.boardJson);
    if (!board) {
      const memoryData = await memoryRoundCreateData({
        duelId: duel.id,
        attackerId: actorId,
        pairCount: duelCfg.memoryPairs,
        roundNumber,
      });
      board = memoryData.board;
      await prisma.duelRound.update({
        where: { id: round.id },
        data: {
          roundType: "MEMORY",
          boardJson: memoryData.boardJson,
          draftOptionIds: [],
        },
      });
    }
    const mem = fabricateBotMemoryLog(board, difficulty);
    const attackCorrect = mem.pairsFound;
    const nextStatus = statusAfterAttackSubmit(roundNumber);
    const isChallenger = actorId === duel.challengerId;
    const challengerCorrect =
      duel.challengerCorrect + (isChallenger ? attackCorrect : 0);
    const opponentCorrect =
      duel.opponentCorrect + (!isChallenger ? attackCorrect : 0);
    const turnUserId =
      nextStatus === "WAITING_B" ? duel.opponentId : duel.challengerId;

    await prisma.$transaction(async (tx) => {
      await tx.duelRound.update({
        where: { id: round!.id },
        data: {
          roundType: "MEMORY",
          attackAnswers: mem,
          attackCorrect,
          attackSubmittedAt: now,
          attackStartedAt: now,
          attackerId: actorId,
        },
      });
      await tx.duelMatch.update({
        where: { id: duel.id },
        data: {
          status: nextStatus,
          turnUserId,
          turnDeadlineAt: new Date(
            now.getTime() + duelCfg.turnHours * 60 * 60 * 1000,
          ),
          botPlayAt: null,
          challengerCorrect,
          opponentCorrect,
        },
      });
    });
    return true;
  }

  const used = usedCategoryIdsFromRounds(
    duel.rounds.filter((r) => r.id !== round!.id),
  );
  let draftIds = Array.isArray(round.draftOptionIds)
    ? (round.draftOptionIds as string[])
    : [];
  if (draftIds.length === 0) {
    const draft = await pickDraftCategories(duelCfg.draftChoices, used);
    draftIds = draft.map((c) => c.id);
    await prisma.duelRound.update({
      where: { id: round.id },
      data: { draftOptionIds: draftIds },
    });
  }

  const pool = await pickDraftCategories(duelCfg.draftChoices, used);
  const chosen =
    pool.find((c) => draftIds.includes(c.id)) ??
    pool[0] ??
    (await pickDraftCategories(1, used))[0];
  if (!chosen) return false;

  const attackQs = await drawCategoryQuestions(
    chosen.id,
    duelCfg.questionsPerAttack,
  );
  const attackIds = attackQs.map((q) => q.id);
  const attackLog = await fabricateBotAnswers(attackIds, difficulty);
  const graded = await gradeDuelAnswers(
    attackIds,
    attackLog.map((a) => ({
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
      ms: a.ms,
    })),
  );
  const attackCorrect = countCorrect(graded);
  const nextStatus = statusAfterAttackSubmit(roundNumber);
  const isChallenger = actorId === duel.challengerId;
  const challengerCorrect =
    duel.challengerCorrect + (isChallenger ? attackCorrect : 0);
  const opponentCorrect =
    duel.opponentCorrect + (!isChallenger ? attackCorrect : 0);

  const turnUserId =
    nextStatus === "WAITING_B" ? duel.opponentId : duel.challengerId;

  await prisma.$transaction(async (tx) => {
    await tx.duelRound.update({
      where: { id: round!.id },
      data: {
        categoryId: chosen.id,
        questionIds: attackIds,
        attackAnswers: graded,
        attackCorrect,
        attackSubmittedAt: now,
        draftOptionIds: draftIds,
        attackerId: actorId,
      },
    });
    await tx.duelMatch.update({
      where: { id: duel.id },
      data: {
        status: nextStatus,
        turnUserId,
        turnDeadlineAt: new Date(
          now.getTime() + duelCfg.turnHours * 60 * 60 * 1000,
        ),
        botPlayAt: null,
        challengerCorrect,
        opponentCorrect,
      },
    });
  });
  return true;
}
