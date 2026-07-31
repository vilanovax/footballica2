/**
 * Game of the Day rotator (ADR 001 / 002 + Star Path):
 * Tehran day-of-month mod 3 → mystery | grid | starPath.
 * Client-safe (no server-only imports).
 */

import { tehranDayNumber } from "@/lib/game/streak";

export type GameOfTheDayKind = "mystery" | "grid" | "starPath";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const KIND_CYCLE: GameOfTheDayKind[] = ["mystery", "grid", "starPath"];

/** `YYYY-MM-DD` in Asia/Tehran. */
export function gotdDateKey(date: Date = new Date()): string {
  return dayKeyFormatter.format(date);
}

/**
 * day % 3 → 1 mystery · 2 grid · 0 starPath (1-indexed day-of-month).
 */
export function gameOfTheDayKind(dateKey: string): GameOfTheDayKind {
  const day = Number(dateKey.slice(-2));
  if (!Number.isFinite(day) || day < 1) return "mystery";
  return KIND_CYCLE[day % 3]!;
}

export function gameOfTheDayKindNow(now: Date = new Date()): GameOfTheDayKind {
  return gameOfTheDayKind(gotdDateKey(now));
}

/** When today's GotD slot ends (next Tehran midnight) and what rotates in. */
export function gameOfTheDayRotation(now: Date = new Date()): {
  dateKey: string;
  kind: GameOfTheDayKind;
  nextKind: GameOfTheDayKind;
  rotatesAt: Date;
  msUntilRotate: number;
} {
  const dateKey = gotdDateKey(now);
  const dayNum = tehranDayNumber(now);
  const rotatesAt = new Date((dayNum + 1) * 86_400_000);
  const kind = gameOfTheDayKind(dateKey);
  const nextDateKey = dayKeyFormatter.format(rotatesAt);
  const nextKind = gameOfTheDayKind(nextDateKey);
  return {
    dateKey,
    kind,
    nextKind,
    rotatesAt,
    msUntilRotate: Math.max(0, rotatesAt.getTime() - now.getTime()),
  };
}
