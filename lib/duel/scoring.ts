import type { DuelAnswerLogEntry } from "@/lib/duel/types";

/**
 * Server-side score from an answer log. Counts `correct: true` entries.
 * Callers must recompute `correct` from DB question.correctIndex before
 * persisting — never trust the client's boolean.
 */
export function countCorrect(log: DuelAnswerLogEntry[]): number {
  return log.reduce((n, a) => n + (a.correct ? 1 : 0), 0);
}

/** Minimal round shape for tallying football-style set wins. */
export type RoundScoreInput = {
  attackerId: string;
  attackCorrect: number;
  defenseCorrect: number;
  /** Both sides have submitted answers for this round. */
  complete: boolean;
};

/**
 * Round wins: each completed round is a "set". Higher correct count wins the
 * round; equal goals → neither side banks a round win.
 */
export function tallyRoundWins(
  rounds: RoundScoreInput[],
  challengerId: string,
): { challenger: number; opponent: number } {
  let challenger = 0;
  let opponent = 0;
  for (const r of rounds) {
    if (!r.complete) continue;
    const attackerIsChallenger = r.attackerId === challengerId;
    const cGoals = attackerIsChallenger ? r.attackCorrect : r.defenseCorrect;
    const oGoals = attackerIsChallenger ? r.defenseCorrect : r.attackCorrect;
    if (cGoals > oGoals) challenger += 1;
    else if (oGoals > cGoals) opponent += 1;
  }
  return { challenger, opponent };
}

/**
 * Winner by round wins first (football scoreline e.g. 2–0).
 * If rounds are tied, fall back to total correct answers (aggregate goals).
 * Still tied → draw (`null`).
 */
export function resolveDuelWinner(params: {
  challengerId: string;
  opponentId: string | null;
  challengerCorrect: number;
  opponentCorrect: number;
  challengerRoundWins: number;
  opponentRoundWins: number;
}): string | null {
  if (params.challengerRoundWins !== params.opponentRoundWins) {
    return params.challengerRoundWins > params.opponentRoundWins
      ? params.challengerId
      : params.opponentId;
  }
  if (params.challengerCorrect === params.opponentCorrect) return null;
  if (params.challengerCorrect > params.opponentCorrect) {
    return params.challengerId;
  }
  return params.opponentId;
}
