// Daily play-streak logic (Duolingo-style retention loop). Pure + framework
// free. Streak days are measured in the Asia/Tehran calendar so "today" matches
// the player's local day regardless of server timezone.

const TIME_ZONE = "Asia/Tehran";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Ordinal day number (days since the Unix epoch) for a Date, evaluated in the
 * Asia/Tehran calendar. Two Dates on the same Tehran calendar day share a
 * number; consecutive days differ by exactly 1.
 */
export function tehranDayNumber(date: Date): number {
  const parts = dayFormatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export type StreakInput = {
  dailyStreak: number;
  longestDailyStreak: number;
  lastPlayedDate: Date | null;
};

export type StreakUpdate = {
  dailyStreak: number;
  longestDailyStreak: number;
  /** Timestamp to persist as the new anchor (the current play time). */
  lastPlayedDate: Date;
  /** First play of a fresh Tehran day (streak advanced or reset). */
  isNewDay: boolean;
  /** True when the streak counter actually increased today. */
  extended: boolean;
};

/**
 * Fold a completed play session into the streak state:
 *  - first play of the day after yesterday → streak + 1
 *  - already played today → unchanged (still counts as played)
 *  - a gap of 2+ days (or never played) → reset to 1
 */
export function computeStreakUpdate(
  input: StreakInput,
  now: Date = new Date(),
): StreakUpdate {
  const today = tehranDayNumber(now);
  const last = input.lastPlayedDate
    ? tehranDayNumber(input.lastPlayedDate)
    : null;

  let dailyStreak: number;
  let extended = false;

  if (last === null) {
    dailyStreak = 1;
    extended = true;
  } else if (last === today) {
    // Already played today — keep the streak, never below 1.
    dailyStreak = Math.max(1, input.dailyStreak);
  } else if (last === today - 1) {
    dailyStreak = input.dailyStreak + 1;
    extended = true;
  } else {
    // Missed at least one full day → streak broken.
    dailyStreak = 1;
    extended = true;
  }

  const longestDailyStreak = Math.max(input.longestDailyStreak, dailyStreak);

  return {
    dailyStreak,
    longestDailyStreak,
    lastPlayedDate: now,
    isNewDay: last !== today,
    extended,
  };
}
