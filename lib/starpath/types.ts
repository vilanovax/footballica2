/** Star Path (مسیر ستاره) — GotD sequential club-clue puzzle. */

export type StarPathAttemptStatus = "IN_PROGRESS" | "SOLVED" | "FAILED";

/** Score tiers by how many clubs were visible when solved. */
export const STAR_PATH_SCORE_BY_CLUES: Record<number, number> = {
  1: 100,
  2: 75,
  3: 50,
  4: 25,
};

export const STAR_PATH_MAX_CLUES = 4;

export type StarPathClubStep = {
  name: string;
};

export type StarPathGuessRecord = {
  playerId: string;
  correct: boolean;
  at: string;
};

export type StarPathPlayerOption = {
  id: string;
  nameEn: string;
  nameFa: string;
  club: string;
};

export function scoreForCluesRevealed(cluesRevealed: number): number {
  const n = Math.max(1, Math.min(STAR_PATH_MAX_CLUES, Math.floor(cluesRevealed)));
  return STAR_PATH_SCORE_BY_CLUES[n] ?? 0;
}
