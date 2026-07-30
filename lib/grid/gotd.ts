/**
 * Game of the Day rotator (ADR 002): one daily type per Tehran day.
 * Odd day-of-month → Mystery (حدس بازیکن); even → Football Grid.
 * Client-safe (no server-only imports).
 */

import { tehranDayNumber } from "@/lib/game/streak";

export type GameOfTheDayKind = "mystery" | "grid";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` in Asia/Tehran. */
export function gotdDateKey(date: Date = new Date()): string {
  return dayKeyFormatter.format(date);
}

/**
 * Odd → mystery, even → grid (Tehran calendar day from `YYYY-MM-DD`).
 */
export function gameOfTheDayKind(dateKey: string): GameOfTheDayKind {
  const day = Number(dateKey.slice(-2));
  if (!Number.isFinite(day)) return "mystery";
  return day % 2 === 0 ? "grid" : "mystery";
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
  const nextKind: GameOfTheDayKind = kind === "mystery" ? "grid" : "mystery";
  return {
    dateKey,
    kind,
    nextKind,
    rotatesAt,
    msUntilRotate: Math.max(0, rotatesAt.getTime() - now.getTime()),
  };
}
