import type { Question, QuestionDifficulty as PrismaDifficulty } from "@/generated/prisma/client";
import { parseCareerPath, parseHigherLower } from "./formats";
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

function parseLocaleContent(raw: unknown): QuizContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const optionsRaw = Array.isArray(o.options) ? o.options : ["", "", "", ""];
  const options = [0, 1, 2, 3].map((i) =>
    typeof optionsRaw[i] === "string" ? optionsRaw[i] : "",
  ) as [string, string, string, string];
  const careerPath = parseCareerPath(o.careerPath);
  const higherLower = parseHigherLower(o.higherLower);
  return {
    text: typeof o.text === "string" ? o.text : "",
    options,
    category: typeof o.category === "string" ? o.category : "",
    ...(careerPath ? { careerPath } : {}),
    ...(higherLower ? { higherLower } : {}),
  };
}

/**
 * Map a persisted `Question` row to the framework-free `QuizQuestion` the game
 * engine + scoring expect. Soft-parses format payloads (careerPath / higherLower).
 */
export function dbQuestionToQuiz(row: Question): QuizQuestion {
  const raw = (row.content && typeof row.content === "object"
    ? row.content
    : {}) as Record<string, unknown>;
  const content: Record<QuizLocale, QuizContent> = {
    en: parseLocaleContent(raw.en),
    fa: parseLocaleContent(raw.fa),
  };
  return {
    id: row.id,
    content,
    correctIndex: row.correctIndex,
    difficulty: DIFFICULTY_MAP[row.difficulty],
    type: row.type,
    mediaUrl: row.mediaUrl,
    explanation: parseExplanation(row.explanation),
  };
}
