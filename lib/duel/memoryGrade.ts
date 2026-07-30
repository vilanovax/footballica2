import type {
  MemoryAttemptLog,
  MemoryAttemptSubmission,
  MemoryBoardJson,
} from "@/lib/duel/memoryTypes";
import { MEMORY_SUBMIT_GRACE_MS } from "@/lib/duel/memoryTypes";

/**
 * Recompute pairs from board + claimed matches. Never trust client goals alone.
 * Each card may appear in at most one accepted match; pairKeys must match.
 */
export function gradeMemoryAttempt(
  board: MemoryBoardJson,
  submission: MemoryAttemptSubmission,
): MemoryAttemptLog {
  const byId = new Map(board.cards.map((c) => [c.id, c]));
  const used = new Set<string>();
  const matches: MemoryAttemptLog["matches"] = [];

  const claims = Array.isArray(submission.matches) ? submission.matches : [];
  for (const claim of claims) {
    if (!claim || typeof claim.cardA !== "string" || typeof claim.cardB !== "string") {
      continue;
    }
    if (claim.cardA === claim.cardB) continue;
    if (used.has(claim.cardA) || used.has(claim.cardB)) continue;

    const a = byId.get(claim.cardA);
    const b = byId.get(claim.cardB);
    if (!a || !b) continue;
    if (a.pairKey !== b.pairKey) continue;
    // Must be complementary faces (PLAYER ↔ COUNTRY).
    if (a.face === b.face) continue;

    used.add(a.id);
    used.add(b.id);
    matches.push({
      cardA: a.id,
      cardB: b.id,
      pairKey: a.pairKey,
      atMs: typeof claim.atMs === "number" ? claim.atMs : 0,
    });
  }

  const flips = Array.isArray(submission.flips)
    ? submission.flips
        .filter(
          (f) =>
            f &&
            typeof f.cardId === "string" &&
            byId.has(f.cardId) &&
            typeof f.atMs === "number",
        )
        .slice(0, 64)
        .map((f) => ({ cardId: f.cardId, atMs: f.atMs }))
    : [];

  return {
    version: 1,
    kind: "MEMORY",
    pairsFound: matches.length,
    pairCount: board.pairCount,
    matches,
    flips,
    durationMs:
      typeof submission.durationMs === "number" && submission.durationMs >= 0
        ? Math.min(submission.durationMs, 120_000)
        : 0,
    timedOut: Boolean(submission.timedOut),
  };
}

/** True when now is past startedAt + turnMs + grace (hard reject). */
export function isMemorySubmitTooLate(
  startedAt: Date | null | undefined,
  turnMs: number,
  now = new Date(),
): boolean {
  if (!startedAt) return true;
  const deadline = startedAt.getTime() + turnMs + MEMORY_SUBMIT_GRACE_MS;
  return now.getTime() > deadline;
}

export function memoryEndsAt(startedAt: Date, turnMs: number): Date {
  return new Date(startedAt.getTime() + turnMs);
}
