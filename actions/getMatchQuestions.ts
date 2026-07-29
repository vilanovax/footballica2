"use server";

import { prisma } from "@/lib/prisma";
import { injectFormatMocks } from "@/lib/dev/formatMocks";
import { resolveForceFormat } from "@/lib/dev/resolveForceFormat";
import {
  FORMAT_BIAS_EVERY_N,
  formatBiasQuota,
  isLiveOpsFormatType,
  resolvePreferredFormatTypes,
} from "@/lib/quiz/formatBias";
import { resolveThemeBias } from "@/lib/game/liveOpsTheme";
import { getGameConfig } from "@/lib/game/gameConfig";
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
 * Normalize a correct-answer string so semantically identical answers collide
 * (case, whitespace, ZWNJ, trailing punctuation). Used to keep two questions
 * that share the SAME correct answer out of a single match — a lightweight
 * "same fact" guard until a proper factId/embedding layer exists.
 */
function normalizeAnswer(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, "") // zero-width non-joiner (Persian)
    .replace(/\s+/g, " ")
    .replace(/[.,!?؟،:;'"“”']/g, "");
}

/** The normalized correct answer for a quiz question (EN canonical, FA fallback). */
function correctAnswerKey(q: QuizQuestion): string {
  const en = q.content.en?.options?.[q.correctIndex];
  const fa = q.content.fa?.options?.[q.correctIndex];
  return normalizeAnswer(en || fa || "");
}

function tryPick(
  pool: QuizQuestion[],
  picked: QuizQuestion[],
  usedAnswers: Set<string>,
  count: number,
) {
  for (const q of pool) {
    if (picked.length >= count) return;
    if (picked.some((p) => p.id === q.id)) continue;
    const key = correctAnswerKey(q);
    if (key && usedAnswers.has(key)) continue;
    if (key) usedAnswers.add(key);
    picked.push(q);
  }
}

/**
 * Draw N random PUBLISHED questions for a match.
 *
 * Live-Ops bias: reserve ~1 non-TEXT format slot per {@link FORMAT_BIAS_EVERY_N}
 * questions when the bank has formats (ADR 001). Answer-dedupe still applies.
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
      status: "PUBLISHED",
      ...(difficulties?.length
        ? { difficulty: { in: difficulties.map((d) => DIFFICULTY_TO_DB[d]) } }
        : {}),
    },
  });

  const config = await getGameConfig();
  const themeBias = resolveThemeBias({
    themeKey: config.liveOps.themeKey,
    preferredTypes: config.liveOps.preferredTypes,
    formatBiasEveryN: config.liveOps.formatBiasEveryN,
    fallbackEveryN: FORMAT_BIAS_EVERY_N,
  });
  const preferredTypes = resolvePreferredFormatTypes(
    themeBias?.preferredTypes ?? null,
  );
  const everyN = themeBias?.everyN ?? FORMAT_BIAS_EVERY_N;

  const pool = shuffle(rows).map(dbQuestionToQuiz);
  const formatPool = shuffle(
    pool.filter((q) => isLiveOpsFormatType(q.type, preferredTypes)),
  );
  const textPool = shuffle(
    pool.filter((q) => !isLiveOpsFormatType(q.type, preferredTypes)),
  );

  const picked: QuizQuestion[] = [];
  const usedAnswers = new Set<string>();
  const quota = Math.min(formatBiasQuota(count, everyN), formatPool.length);

  // 1) Reserve format slots first (so TEXT volume can't drown them).
  if (quota > 0) {
    tryPick(formatPool, picked, usedAnswers, quota);
  }

  // 2) Fill remaining from TEXT-first, then leftover formats.
  tryPick(textPool, picked, usedAnswers, count);
  if (picked.length < count) {
    tryPick(formatPool, picked, usedAnswers, count);
  }

  // Don't always put the format kick first — shuffle final hand.
  const hand = shuffle(picked);
  const force = await resolveForceFormat();
  if (!force) return hand;

  // Empty bank: still return mock formats so UI polish works without content.
  if (hand.length === 0) {
    const mocks = injectFormatMocks([], force);
    const out: QuizQuestion[] = [];
    for (let i = 0; i < count; i++) {
      const m = mocks[i % mocks.length]!;
      out.push({ ...m, id: `${m.id}-${i}` });
    }
    return out;
  }

  return injectFormatMocks(hand, force);
}
