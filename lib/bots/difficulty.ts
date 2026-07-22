import type { BotDifficulty } from "@/generated/prisma/client";

export type { BotDifficulty };

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = [
  "EASY",
  "MEDIUM",
  "HARD",
] as const;

export function isBotDifficulty(value: string): value is BotDifficulty {
  return (BOT_DIFFICULTIES as readonly string[]).includes(value);
}

/** Probability the bot picks the correct answer, by difficulty band. */
export function botAccuracy(difficulty: BotDifficulty | null | undefined): number {
  switch (difficulty) {
    case "EASY":
      return 0.4;
    case "HARD":
      return 0.85;
    case "MEDIUM":
    default:
      return 0.62;
  }
}
