import type { Question, QuestionDifficulty as PrismaDifficulty } from "@/generated/prisma/client";
import type {
  QuizContent,
  QuizLocale,
  QuizQuestion,
  QuestionDifficulty,
} from "./types";

const DIFFICULTY_MAP: Record<PrismaDifficulty, QuestionDifficulty> = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

function parseExplanation(
  raw: unknown,
): { en: string; fa: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const en = typeof o.en === "string" ? o.en.trim() : "";
  const fa = typeof o.fa === "string" ? o.fa.trim() : "";
  if (!en && !fa) return null;
  return { en, fa };
}

/**
 * Map a persisted `Question` row to the framework-free `QuizQuestion` the game
 * engine + scoring expect. The `content` JSON column is stored in exactly the
 * `{ [locale]: { text, options, category } }` shape, so it passes through.
 */
export function dbQuestionToQuiz(row: Question): QuizQuestion {
  return {
    id: row.id,
    content: row.content as unknown as Record<QuizLocale, QuizContent>,
    correctIndex: row.correctIndex,
    difficulty: DIFFICULTY_MAP[row.difficulty],
    type: row.type,
    mediaUrl: row.mediaUrl,
    explanation: parseExplanation(row.explanation),
  };
}
