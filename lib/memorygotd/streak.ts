import { tehranDayNumber } from "@/lib/game/streak";

export type MemoryStreakInput = {
  memoryStreak: number;
  longestMemoryStreak: number;
  lastMemoryDate: Date | null;
};

export type MemoryStreakUpdate = {
  memoryStreak: number;
  longestMemoryStreak: number;
  lastMemoryDate: Date;
  extended: boolean;
  isNewDay: boolean;
};

/**
 * Fold a SOLVED Memory GotD day into Club streak counters.
 * Only call on first solve of a Tehran day.
 */
export function computeMemoryStreakUpdate(
  input: MemoryStreakInput,
  now: Date = new Date(),
): MemoryStreakUpdate {
  const today = tehranDayNumber(now);
  const last = input.lastMemoryDate
    ? tehranDayNumber(input.lastMemoryDate)
    : null;

  let memoryStreak: number;
  let extended = false;
  let isNewDay = true;

  if (last === null) {
    memoryStreak = 1;
    extended = true;
  } else if (last === today) {
    memoryStreak = Math.max(1, input.memoryStreak);
    isNewDay = false;
  } else if (last === today - 1) {
    memoryStreak = input.memoryStreak + 1;
    extended = true;
  } else {
    memoryStreak = 1;
    extended = true;
  }

  return {
    memoryStreak,
    longestMemoryStreak: Math.max(input.longestMemoryStreak, memoryStreak),
    lastMemoryDate: now,
    extended,
    isNewDay,
  };
}
