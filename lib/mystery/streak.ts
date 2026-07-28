import { tehranDayNumber } from "@/lib/game/streak";

export type MysteryStreakInput = {
  mysteryStreak: number;
  longestMysteryStreak: number;
  lastMysteryDate: Date | null;
};

export type MysteryStreakUpdate = {
  mysteryStreak: number;
  longestMysteryStreak: number;
  lastMysteryDate: Date;
  extended: boolean;
  isNewDay: boolean;
};

/**
 * Fold a SOLVED mystery day into Club mystery streak counters.
 * Only call on first solve of a Tehran day (attempt transitions to SOLVED).
 */
export function computeMysteryStreakUpdate(
  input: MysteryStreakInput,
  now: Date = new Date(),
): MysteryStreakUpdate {
  const today = tehranDayNumber(now);
  const last = input.lastMysteryDate
    ? tehranDayNumber(input.lastMysteryDate)
    : null;

  let mysteryStreak: number;
  let extended = false;
  let isNewDay = true;

  if (last === null) {
    mysteryStreak = 1;
    extended = true;
  } else if (last === today) {
    mysteryStreak = Math.max(1, input.mysteryStreak);
    isNewDay = false;
  } else if (last === today - 1) {
    mysteryStreak = input.mysteryStreak + 1;
    extended = true;
  } else {
    mysteryStreak = 1;
    extended = true;
  }

  return {
    mysteryStreak,
    longestMysteryStreak: Math.max(input.longestMysteryStreak, mysteryStreak),
    lastMysteryDate: now,
    extended,
    isNewDay,
  };
}
