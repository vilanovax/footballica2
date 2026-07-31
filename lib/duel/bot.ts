import "server-only";

import { prisma } from "@/lib/prisma";
import type { BotDifficulty, Prisma } from "@/generated/prisma/client";
import { getGameConfig } from "@/lib/game/gameConfig";
import { normalizeClubName } from "@/lib/auth/blacklist";
import { botAccuracy } from "@/lib/bots/difficulty";
import { countCorrect } from "@/lib/duel";
import type { DuelAnswerLogEntry } from "@/lib/duel/types";
import {
  duelHasMemoryRound,
  memoryRoundCreateData,
} from "@/lib/duel/createMemoryRound";
import { quizRoundCreateData } from "@/lib/duel/createQuizRound";
import { usedCategoryIdsFromRounds } from "@/lib/duel/draw";
import { drawCategoryQuestions } from "@/lib/duel/draw";
import { fabricateBotMemoryLog } from "@/lib/duel/memoryBot";
import { parseMemoryBoard } from "@/lib/duel/memoryBoard";
import { gradeDuelAnswers } from "@/lib/duel/grade";

export const BOT_EMAIL = "bot@footballica.local";
const BOT_CLUB_NAME = "Bot United";

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Legacy system bot — kept as last-resort fallback when the Admin pool is empty.
 * Marked `isBot: true` so it appears in the CMS after first use.
 */
export async function getOrCreateBotUser(db: Db = prisma) {
  const existing = await db.user.findUnique({
    where: { email: BOT_EMAIL },
    include: { club: true },
  });
  if (existing) {
    if (!existing.isBot) {
      return db.user.update({
        where: { id: existing.id },
        data: {
          isBot: true,
          botEnabled: true,
          botDifficulty: existing.botDifficulty ?? "MEDIUM",
        },
        include: { club: true },
      });
    }
    return existing;
  }

  const normalized = normalizeClubName(BOT_CLUB_NAME);
  return db.user.create({
    data: {
      email: BOT_EMAIL,
      displayName: "Bot Manager",
      managerAvatar: "TACTICAL_COACH",
      isBot: true,
      botEnabled: true,
      botDifficulty: "MEDIUM",
      club: {
        create: {
          name: BOT_CLUB_NAME,
          nameNormalized: `${normalized}-system`,
          avatar: "TACTICAL_COACH",
          tutorialStep: 2,
        },
      },
    },
    include: { club: true },
  });
}

/**
 * Pick a random Admin-generated bot from the pool (optionally filtered by
 * difficulty). Falls back to the system bot when the pool is empty.
 */
export async function pickRandomBotUser(
  preferredDifficulty?: BotDifficulty | null,
  db: Db = prisma,
) {
  const poolSize = 40;
  if (preferredDifficulty) {
    const preferred = await db.user.findMany({
      where: {
        isBot: true,
        botEnabled: true,
        botDifficulty: preferredDifficulty,
      },
      include: { club: true },
      take: poolSize,
      orderBy: { createdAt: "desc" },
    });
    if (preferred.length > 0) {
      return preferred[Math.floor(Math.random() * preferred.length)]!;
    }
  }

  const any = await db.user.findMany({
    where: { isBot: true, botEnabled: true },
    include: { club: true },
    take: poolSize,
    orderBy: { createdAt: "desc" },
  });
  if (any.length > 0) {
    return any[Math.floor(Math.random() * any.length)]!;
  }

  return getOrCreateBotUser(db);
}

/** Random delay inside the Live-Ops window (simulated human think time). */
export async function randomBotDelayMs(): Promise<number> {
  const { duel } = await getGameConfig();
  const min = Math.min(duel.botDelayMinMs, duel.botDelayMaxMs);
  const max = Math.max(duel.botDelayMinMs, duel.botDelayMaxMs);
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function scheduleBotPlayAt(now = new Date(), delayMs?: number): Date {
  const ms = delayMs ?? 0;
  return new Date(now.getTime() + ms);
}

/**
 * Build plausible bot answers. Accuracy follows `botDifficulty`
 * (EASY ~40%, MEDIUM ~62%, HARD ~85%).
 */
export async function fabricateBotAnswers(
  questionIds: string[],
  difficulty?: BotDifficulty | null,
): Promise<DuelAnswerLogEntry[]> {
  const accuracy = botAccuracy(difficulty);
  const rows = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, correctIndex: true, content: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  return questionIds.map((id) => {
    const row = byId.get(id);
    if (!row) {
      return { questionId: id, selectedIndex: 0, correct: false };
    }
    const hit = Math.random() < accuracy;
    let selected = row.correctIndex;
    if (!hit) {
      const wrong = [0, 1, 2, 3].filter((i) => i !== row.correctIndex);
      selected = wrong[Math.floor(Math.random() * wrong.length)] ?? 0;
    }
    return {
      questionId: id,
      selectedIndex: selected,
      correct: selected === row.correctIndex,
      ms: 2000 + Math.floor(Math.random() * 8000),
    };
  });
}

/**
 * Execute every due bot action for one duel (defense + attack in one shot after delay).
 * Safe to call repeatedly — no-ops when not due / not a bot duel.
 *
 * Round formats: Memory once per duel. If human already spent Memory in R1,
 * bot attacks R2 as QUIZ; otherwise bot prefers Memory for R2.
 */
export async function runBotTurnIfDue(duelId: string, now = new Date()): Promise<boolean> {
  const duel = await prisma.duelMatch.findUnique({
    where: { id: duelId },
    include: { rounds: { orderBy: { roundNumber: "asc" } } },
  });
  if (!duel?.isBotOpponent || !duel.opponentId) return false;
  if (!duel.botPlayAt || duel.botPlayAt.getTime() > now.getTime()) return false;
  if (duel.status !== "WAITING_B" && duel.status !== "B_DEFENDING") return false;

  const botUser = await prisma.user.findUnique({
    where: { id: duel.opponentId },
    select: { botDifficulty: true },
  });
  const difficulty = botUser?.botDifficulty ?? "MEDIUM";

  const config = await getGameConfig();
  const round1 = duel.rounds.find((r) => r.roundNumber === 1);
  if (!round1) return false;

  // ── Defend round 1 (QUIZ or MEMORY) ───────────────────────────────────────
  let defenseLog: DuelAnswerLogEntry[] | ReturnType<typeof fabricateBotMemoryLog>;
  let defenseCorrect: number;

  if (round1.roundType === "MEMORY") {
    const board = parseMemoryBoard(round1.boardJson);
    if (!board) return false;
    const mem = fabricateBotMemoryLog(board, difficulty);
    defenseLog = mem;
    defenseCorrect = mem.pairsFound;
  } else {
    if (!round1.questionIds || !Array.isArray(round1.questionIds)) return false;
    const qIds = round1.questionIds as string[];
    const quizLog = await fabricateBotAnswers(qIds, difficulty);
    defenseLog = quizLog;
    defenseCorrect = countCorrect(quizLog);
  }

  // ── Attack round 2 ────────────────────────────────────────────────────────
  const memorySpent = duelHasMemoryRound(duel.rounds);
  let attackCorrect = 0;

  const challengerCorrect = duel.challengerCorrect;
  let opponentCorrect = duel.opponentCorrect + defenseCorrect;

  await prisma.$transaction(async (tx) => {
    await tx.duelRound.update({
      where: { id: round1.id },
      data: {
        defenseAnswers: defenseLog as object,
        defenseCorrect,
        defenseSubmittedAt: now,
      },
    });

    if (!memorySpent) {
      const memoryData = await memoryRoundCreateData({
        duelId: duel.id,
        attackerId: duel.opponentId!,
        pairCount: config.duel.memoryPairs,
        roundNumber: 2,
      });
      const memoryAttack = fabricateBotMemoryLog(memoryData.board, difficulty);
      attackCorrect = memoryAttack.pairsFound;
      opponentCorrect += attackCorrect;

      await tx.duelRound.create({
        data: {
          duelId: duel.id,
          roundNumber: memoryData.roundNumber,
          roundType: memoryData.roundType,
          attackerId: memoryData.attackerId,
          draftOptionIds: memoryData.draftOptionIds,
          boardJson: memoryData.boardJson,
          attackAnswers: memoryAttack,
          attackCorrect,
          attackSubmittedAt: now,
          attackStartedAt: now,
        },
      });
    } else {
      const quizData = await quizRoundCreateData({
        attackerId: duel.opponentId!,
        roundNumber: 2,
        excludeCategoryIds: usedCategoryIdsFromRounds(duel.rounds),
      });
      const draftIds = quizData.draftOptionIds as string[];
      const categoryId = draftIds[0];
      if (!categoryId) throw new Error("not_enough_categories");

      const attackQs = await drawCategoryQuestions(
        categoryId,
        config.duel.questionsPerAttack,
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
      attackCorrect = countCorrect(graded);
      opponentCorrect += attackCorrect;

      await tx.duelRound.create({
        data: {
          duelId: duel.id,
          roundNumber: quizData.roundNumber,
          roundType: "QUIZ",
          attackerId: quizData.attackerId,
          draftOptionIds: quizData.draftOptionIds,
          categoryId,
          questionIds: attackIds,
          attackAnswers: graded,
          attackCorrect,
          attackSubmittedAt: now,
        },
      });
    }

    await tx.duelMatch.update({
      where: { id: duel.id },
      data: {
        status: "WAITING_A",
        turnUserId: duel.challengerId,
        turnDeadlineAt: new Date(
          now.getTime() + config.duel.turnHours * 60 * 60 * 1000,
        ),
        botPlayAt: null,
        challengerCorrect,
        opponentCorrect,
      },
    });
  });

  return true;
}

/** Process all duels whose bot delay has elapsed (cron / opportunistic). */
export async function processDueBotTurns(limit = 20): Promise<number> {
  const now = new Date();
  const due = await prisma.duelMatch.findMany({
    where: {
      isBotOpponent: true,
      botPlayAt: { lte: now },
      status: { in: ["WAITING_B", "B_DEFENDING"] },
    },
    select: { id: true },
    take: limit,
    orderBy: { botPlayAt: "asc" },
  });

  let n = 0;
  for (const row of due) {
    const ok = await runBotTurnIfDue(row.id, now);
    if (ok) n += 1;
  }
  return n;
}
