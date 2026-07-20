// Quiz domain types. Kept framework-free so game logic stays testable.

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuizQuestion = {
  id: string;
  questionText: string;
  /** Always 4 options (see PRD §8). */
  options: [string, string, string, string];
  /** Index 0-3 of the correct option. */
  correctIndex: number;
  difficulty: QuestionDifficulty;
  category: string;
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
