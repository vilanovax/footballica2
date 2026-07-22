/**
 * Presentation model for the Duel Scorecard.
 * Kept free of Prisma so we can drive the UI with mocks first, then map
 * real `DuelSnapshot` → this shape later.
 */

export type ScorecardMatchStatus = "YOUR_TURN" | "WAITING" | "COMPLETED";

export type ScorecardOutcome = "WIN" | "LOSE" | "DRAW" | null;

export type ScorecardAnswer = boolean | null;

export type ScorecardPlayer = {
  name: string;
  avatarKey: string;
  /** Club brand palette key for scoped ring accents. */
  colorKey?: string | null;
  /** Manager / club level shown on the badge. */
  level: number;
  isBot?: boolean;
};

export type ScorecardRound = {
  roundNumber: number;
  categoryNameEn: string;
  categoryNameFa: string;
  /** Length = questions in the round (v1: 5). null = unanswered slot. */
  youAnswers: ScorecardAnswer[];
  themAnswers: ScorecardAnswer[];
  /** True when the rival hasn't played this round yet. */
  waitingOnThem?: boolean;
  /** True when this round hasn't started. */
  locked?: boolean;
};

export type ScorecardData = {
  status: ScorecardMatchStatus;
  outcome: ScorecardOutcome;
  you: ScorecardPlayer;
  them: ScorecardPlayer;
  youScore: number;
  themScore: number;
  rounds: ScorecardRound[];
  /** Optional CTA label override (otherwise derived from status). */
  ctaLabel?: string;
};
