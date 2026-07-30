/** Domain types for Mysterious Player (بازیکن مرموز). Pure — no Prisma. */

export const MYSTERY_MAX_GUESSES = 6;

export type MysteryPosition = "GK" | "DEF" | "MID" | "FWD";

export type MysteryPlayer = {
  id: string;
  /** Display name (English). */
  nameEn: string;
  /** Display name (Persian). */
  nameFa: string;
  nationality: string;
  /** ISO-ish nationality code for UI chips (e.g. IR, BR, AR). */
  nationalityCode: string;
  position: MysteryPosition;
  league: string;
  club: string;
  /** Age as of puzzle authoring (integer years). */
  age: number;
  shirtNumber: number;
};

export type AttributeVerdict = "correct" | "close" | "wrong";
export type CompareVerdict = "correct" | "higher" | "lower";

/** One submitted guess + attribute feedback (stored in Attempt.guesses JSON). */
export type MysteryGuessRecord = {
  playerId: string;
  nameEn: string;
  nameFa: string;
  /** Verdicts (share grid / evaluate). */
  nationality: AttributeVerdict;
  position: AttributeVerdict;
  league: AttributeVerdict;
  club: AttributeVerdict;
  age: CompareVerdict;
  shirtNumber: CompareVerdict;
  /**
   * Guessed player's attribute values — shown inside colored tiles so the
   * player can cross-reference for the next guess. Optional for legacy rows.
   */
  nationalityValue?: string;
  positionValue?: MysteryPosition;
  leagueValue?: string;
  clubValue?: string;
  ageValue?: number;
  shirtNumberValue?: number;
  isCorrect: boolean;
  at: string; // ISO
};

export type MysteryAttemptStatus = "IN_PROGRESS" | "SOLVED" | "FAILED";

/** Safe catalog row for guess picker (no secret attributes beyond identity). */
export type MysteryPlayerOption = {
  id: string;
  nameEn: string;
  nameFa: string;
  club: string;
  nationalityCode: string;
};
