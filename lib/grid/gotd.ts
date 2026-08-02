/**
 * Game of the Day rotator (ADR 001 / 002 + Mode Placement Catalog):
 * Among admin-enabled GotD modes, cycle by Tehran day-of-month.
 * Client-safe (no server-only imports).
 */

import { tehranDayNumber } from "@/lib/game/streak";
import type { GameConfig, LiveModeId } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import { gotdEnabledModes } from "@/lib/game/liveModes";

export type GameOfTheDayKind = LiveModeId;

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
 * Pick today's GotD kind from the enabled list (stable order).
 * Returns null when admin disabled every GotD mode.
 */
export function gameOfTheDayKind(
  dateKey: string,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): GameOfTheDayKind | null {
  const enabled = gotdEnabledModes(config);
  if (enabled.length === 0) return null;
  const day = Number(dateKey.slice(-2));
  if (!Number.isFinite(day) || day < 1) return enabled[0]!;
  return enabled[day % enabled.length]!;
}

export function gameOfTheDayKindNow(
  now: Date = new Date(),
  config: GameConfig = DEFAULT_GAME_CONFIG,
): GameOfTheDayKind | null {
  return gameOfTheDayKind(gotdDateKey(now), config);
}

/** When today's GotD slot ends (next Tehran midnight) and what rotates in. */
export function gameOfTheDayRotation(
  now: Date = new Date(),
  config: GameConfig = DEFAULT_GAME_CONFIG,
): {
  dateKey: string;
  kind: GameOfTheDayKind | null;
  nextKind: GameOfTheDayKind | null;
  rotatesAt: Date;
  msUntilRotate: number;
  enabled: GameOfTheDayKind[];
} {
  const dateKey = gotdDateKey(now);
  const dayNum = tehranDayNumber(now);
  const rotatesAt = new Date((dayNum + 1) * 86_400_000);
  const enabled = gotdEnabledModes(config);
  const kind = gameOfTheDayKind(dateKey, config);
  const nextDateKey = dayKeyFormatter.format(rotatesAt);
  const nextKind = gameOfTheDayKind(nextDateKey, config);
  return {
    dateKey,
    kind,
    nextKind,
    rotatesAt,
    msUntilRotate: Math.max(0, rotatesAt.getTime() - now.getTime()),
    enabled,
  };
}
