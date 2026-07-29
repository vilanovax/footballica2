import { tehranDayNumber } from "@/lib/game/streak";

export type GridStreakInput = {
  gridStreak: number;
  longestGridStreak: number;
  lastGridDate: Date | null;
};

export type GridStreakUpdate = {
  gridStreak: number;
  longestGridStreak: number;
  lastGridDate: Date;
  extended: boolean;
  isNewDay: boolean;
};

export function computeGridStreakUpdate(
  input: GridStreakInput,
  now: Date = new Date(),
): GridStreakUpdate {
  const today = tehranDayNumber(now);
  const last = input.lastGridDate
    ? tehranDayNumber(input.lastGridDate)
    : null;

  let gridStreak: number;
  let extended = false;
  let isNewDay = true;

  if (last === null) {
    gridStreak = 1;
    extended = true;
  } else if (last === today) {
    gridStreak = Math.max(1, input.gridStreak);
    isNewDay = false;
  } else if (last === today - 1) {
    gridStreak = input.gridStreak + 1;
    extended = true;
  } else {
    gridStreak = 1;
    extended = true;
  }

  return {
    gridStreak,
    longestGridStreak: Math.max(input.longestGridStreak, gridStreak),
    lastGridDate: now,
    extended,
    isNewDay,
  };
}
