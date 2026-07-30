import "server-only";

import type { BotDifficulty } from "@/generated/prisma/client";
import { botAccuracy } from "@/lib/bots/difficulty";
import type { MemoryAttemptLog, MemoryBoardJson } from "@/lib/duel/memoryTypes";

/**
 * Fabricate a plausible MEMORY half for bots / shadow — pairs + ms only.
 * Accuracy band maps to expected pairs found (rounded, clamped).
 */
export function fabricateBotMemoryLog(
  board: MemoryBoardJson,
  difficulty?: BotDifficulty | null,
): MemoryAttemptLog {
  const accuracy = botAccuracy(difficulty);
  const target = Math.max(
    0,
    Math.min(
      board.pairCount,
      Math.round(board.pairCount * accuracy + (Math.random() * 1.2 - 0.4)),
    ),
  );

  // Group complementary cards by pairKey.
  const byPair = new Map<string, { player?: string; country?: string }>();
  for (const c of board.cards) {
    const slot = byPair.get(c.pairKey) ?? {};
    if (c.face === "PLAYER") slot.player = c.id;
    else slot.country = c.id;
    byPair.set(c.pairKey, slot);
  }

  const keys = [...byPair.keys()].sort(() => Math.random() - 0.5);
  const matches: MemoryAttemptLog["matches"] = [];
  let atMs = 1800;
  for (let i = 0; i < target; i++) {
    const key = keys[i];
    if (!key) break;
    const pair = byPair.get(key)!;
    if (!pair.player || !pair.country) continue;
    matches.push({
      cardA: pair.player,
      cardB: pair.country,
      pairKey: key,
      atMs,
    });
    atMs += 2200 + Math.floor(Math.random() * 2800);
  }

  const flips: MemoryAttemptLog["flips"] = [];
  for (const m of matches) {
    flips.push({ cardId: m.cardA, atMs: m.atMs - 400 });
    flips.push({ cardId: m.cardB, atMs: m.atMs - 200 });
  }

  return {
    version: 1,
    kind: "MEMORY",
    pairsFound: matches.length,
    pairCount: board.pairCount,
    matches,
    flips,
    durationMs: Math.min(19_500, 4_000 + matches.length * 2_400),
    timedOut: matches.length < board.pairCount,
  };
}
