import type { KickLog, KickResult, QuizQuestion } from "./types";

/** Milliseconds allowed per penalty kick (the fuse). */
export const KICK_DURATION_MS = 10_000;

/** Base coins/xp/fans reward per scored goal. */
const REWARD_PER_GOAL = {
  coins: 25,
  xp: 15,
  fans: 10,
} as const;

/** Bonus coins scaled by how fast the answer came in (0..1 of the fuse). */
const SPEED_BONUS_MAX_COINS = 15;

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

export type MatchRewards = {
  coins: number;
  xp: number;
  fans: number;
  goals: number;
  misses: number;
};

/** Aggregate rewards from a full kick log. Server will re-run this to verify. */
export function computeRewards(log: KickLog[]): MatchRewards {
  return log.reduce<MatchRewards>(
    (acc, kick) => {
      if (kick.result === "goal") {
        const speedRatio = Math.max(
          0,
          Math.min(1, kick.msRemaining / KICK_DURATION_MS),
        );
        acc.coins +=
          REWARD_PER_GOAL.coins +
          Math.round(SPEED_BONUS_MAX_COINS * speedRatio);
        acc.xp += REWARD_PER_GOAL.xp;
        acc.fans += REWARD_PER_GOAL.fans;
        acc.goals += 1;
      } else {
        acc.misses += 1;
      }
      return acc;
    },
    { coins: 0, xp: 0, fans: 0, goals: 0, misses: 0 },
  );
}
