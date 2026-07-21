import type { KickLog, KickResult, QuizQuestion } from "./types";

/** Milliseconds allowed per penalty kick (the fuse). */
export const KICK_DURATION_MS = 10_000;

/** Milliseconds allowed per Quick Match question — tighter, rapid-fire pace. */
export const QUICK_DURATION_MS = 7_000;

export type KickEvaluation = {
  result: KickResult;
  isCorrect: boolean;
  correctIndex: number;
};

/**
 * Pure evaluation of a single kick. `selectedIndex === null` means the fuse
 * ran out (timeout) — always a miss.
 */
export function evaluateKick(
  question: QuizQuestion,
  selectedIndex: number | null,
): KickEvaluation {
  const isCorrect =
    selectedIndex !== null && selectedIndex === question.correctIndex;
  return {
    result: isCorrect ? "goal" : "miss",
    isCorrect,
    correctIndex: question.correctIndex,
  };
}

/**
 * What the client is allowed to submit. Deliberately excludes `result` and
 * `correctIndex` — the server re-derives those from its own question bank so a
 * tampered client cannot claim goals it did not score.
 */
export type KickSubmission = {
  questionId: string;
  selectedIndex: number | null;
  msRemaining: number;
};

/**
 * Rebuild a trusted KickLog from raw client submissions using the authoritative
 * question set. Correctness is recomputed here; timing is clamped to a sane
 * range. Throws on unknown/duplicate questions.
 */
export function verifyKickLog(
  questions: QuizQuestion[],
  submissions: KickSubmission[],
): KickLog[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();

  return submissions.map((submission) => {
    const question = byId.get(submission.questionId);
    if (!question) {
      throw new Error(`Unknown question: ${submission.questionId}`);
    }
    if (seen.has(question.id)) {
      throw new Error(`Duplicate question: ${question.id}`);
    }
    seen.add(question.id);

    const evaluation = evaluateKick(question, submission.selectedIndex);
    const msRemaining = Math.max(
      0,
      Math.min(KICK_DURATION_MS, Math.round(submission.msRemaining) || 0),
    );

    return {
      questionId: question.id,
      selectedIndex: submission.selectedIndex,
      correctIndex: evaluation.correctIndex,
      result: evaluation.result,
      msRemaining,
    };
  });
}
