// Quiz domain types. Kept framework-free so game logic stays testable.

export type QuestionDifficulty = "easy" | "medium" | "hard";

/** Locales that ship a full question bank. Mirrors the i18n locales. */
export type QuizLocale = "en" | "fa";

/** Language-specific presentation of a question. */
export type QuizContent = {
  text: string;
  /** Always 4 options (see PRD §8). Order MUST match across locales so a
   *  single top-level `correctIndex` stays valid in every language. */
  options: [string, string, string, string];
  category: string;
};

export type QuizQuestion = {
  id: string;
  /** Localized text/options/category per language. */
  content: Record<QuizLocale, QuizContent>;
  /** Index 0-3 of the correct option — language-independent. */
  correctIndex: number;
  difficulty: QuestionDifficulty;
};

/** Outcome of a single penalty kick (one question). */
export type KickResult = "goal" | "miss";

/** Per-question log entry for the anti-cheat audit trail (Match.answerLog). */
export type KickLog = {
  questionId: string;
  selectedIndex: number | null;
  correctIndex: number;
  result: KickResult;
  msRemaining: number;
};
