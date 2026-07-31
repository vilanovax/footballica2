import { tehranDayNumber } from "@/lib/game/streak";

export type StarPathStreakInput = {
  starPathStreak: number;
  longestStarPathStreak: number;
  lastStarPathDate: Date | null;
};

export type StarPathStreakUpdate = {
  starPathStreak: number;
  longestStarPathStreak: number;
  lastStarPathDate: Date;
  extended: boolean;
  isNewDay: boolean;
};

/**
 * Fold a SOLVED Star Path day into Club streak counters.
 * Only call on first solve of a Tehran day.
 */
export function computeStarPathStreakUpdate(
  input: StarPathStreakInput,
  now: Date = new Date(),
): StarPathStreakUpdate {
  const today = tehranDayNumber(now);
  const last = input.lastStarPathDate
    ? tehranDayNumber(input.lastStarPathDate)
    : null;

  let starPathStreak: number;
  let extended = false;
  let isNewDay = true;

  if (last === null) {
    starPathStreak = 1;
    extended = true;
  } else if (last === today) {
    starPathStreak = Math.max(1, input.starPathStreak);
    isNewDay = false;
  } else if (last === today - 1) {
    starPathStreak = input.starPathStreak + 1;
    extended = true;
  } else {
    starPathStreak = 1;
    extended = true;
  }

  return {
    starPathStreak,
    longestStarPathStreak: Math.max(
      input.longestStarPathStreak,
      starPathStreak,
    ),
    lastStarPathDate: now,
    extended,
    isNewDay,
  };
}
