"use server";

import { prisma } from "@/lib/prisma";
import { dbQuestionToQuiz } from "@/lib/quiz/questionMapper";
import type { QuizQuestion, QuestionDifficulty } from "@/lib/quiz/types";

// Default kicks per penalty shootout (PRD §8). Kept internal — "use server"
// modules may only export async functions.
const DEFAULT_MATCH_SIZE = 5;

const DIFFICULTY_TO_DB: Record<QuestionDifficulty, "EASY" | "MEDIUM" | "HARD"> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

// Fisher–Yates shuffle (unbiased) for a fresh set each match.
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Draw N random active questions from the DB for a match. The bank is small in
 * the MVP, so we fetch the eligible set and shuffle in memory; swap for a SQL
 * `ORDER BY RANDOM() LIMIT n` (or reservoir sampling) once it grows large.
 *
 * NOTE: returns the full `QuizQuestion` (including `correctIndex`) to preserve
 * the current instant client-side feedback. Hardening this (server-verified
 * per-kick reveal) is a deliberate later step, not part of Phase 1.
 */
export async function getMatchQuestions(options?: {
  /** How many questions to draw (default 5). */
  count?: number;
  /** Restrict to certain difficulties (e.g. tutorial → ["easy"]). */
  difficulties?: QuestionDifficulty[];
}): Promise<QuizQuestion[]> {
  const count = Math.max(1, options?.count ?? DEFAULT_MATCH_SIZE);
  const difficulties = options?.difficulties;

  const rows = await prisma.question.findMany({
    where: {
      isActive: true,
      ...(difficulties?.length
        ? { difficulty: { in: difficulties.map((d) => DIFFICULTY_TO_DB[d]) } }
        : {}),
    },
  });

  return shuffle(rows).slice(0, count).map(dbQuestionToQuiz);
}
