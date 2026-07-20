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
  };
}
