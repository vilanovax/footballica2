/**
 * Typed shapes for Draft Duel MEMORY rounds.
 * Stored in DuelRound.boardJson / attackAnswers / defenseAnswers.
 */

export type MemoryFaceKind = "PLAYER" | "COUNTRY";

export type MemoryCard = {
  id: string;
  /** Shared key linking the two faces of a pair. */
  pairKey: string;
  face: MemoryFaceKind;
  /** PLAYER: FootballPlayer.slug; COUNTRY: ISO nationalityCode. */
  ref: string;
  labelEn: string;
  labelFa: string;
  /** Optional art: /players/{slug}.svg or flag emoji. */
  art: string | null;
};

export type MemoryBoardJson = {
  version: 1;
  seed: string;
  pairCount: number;
  /** Row-major 4×4 (length = pairCount * 2). */
  cards: MemoryCard[];
};

/** Client → server claim for one MEMORY half. */
export type MemoryAttemptSubmission = {
  /** Ordered card flips during the turn (audit / UX replay). */
  flips: { cardId: string; atMs: number }[];
  /** Client-claimed matches; server re-verifies against boardJson. */
  matches: { cardA: string; cardB: string; atMs: number }[];
  durationMs: number;
  timedOut?: boolean;
};

/** Authoritative log persisted on the round. */
export type MemoryAttemptLog = {
  version: 1;
  kind: "MEMORY";
  pairsFound: number;
  pairCount: number;
  matches: {
    cardA: string;
    cardB: string;
    pairKey: string;
    atMs: number;
  }[];
  flips: { cardId: string; atMs: number }[];
  durationMs: number;
  timedOut: boolean;
};

export function isMemoryAttemptLog(raw: unknown): raw is MemoryAttemptLog {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Partial<MemoryAttemptLog>;
  return o.kind === "MEMORY" && typeof o.pairsFound === "number";
}

export function parseMemoryBoard(raw: unknown): MemoryBoardJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MemoryBoardJson>;
  if (
    o.version !== 1 ||
    !Array.isArray(o.cards) ||
    typeof o.pairCount !== "number"
  ) {
    return null;
  }
  return o as MemoryBoardJson;
}

/** Grace after memoryTurnMs for network latency on auto-submit. */
export const MEMORY_SUBMIT_GRACE_MS = 3_000;
