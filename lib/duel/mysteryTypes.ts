import type { MysteryGuessRecord } from "@/lib/mystery/types";

/** Frozen Mystery payload on DuelRound.boardJson. */
export type MysteryBoardJson = {
  kind: "MYSTERY";
  targetPlayerId: string;
  maxGuesses: number;
};

export type MysteryHalfLog = {
  guesses: MysteryGuessRecord[];
  status: "SOLVED" | "FAILED" | "IN_PROGRESS";
  /** Higher is better — leftover guesses × 20 when solved. */
  score: number;
};

export function parseMysteryBoard(raw: unknown): MysteryBoardJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MysteryBoardJson>;
  if (o.kind !== "MYSTERY") return null;
  if (typeof o.targetPlayerId !== "string" || !o.targetPlayerId) return null;
  const maxGuesses =
    typeof o.maxGuesses === "number" && o.maxGuesses >= 3
      ? Math.min(12, Math.floor(o.maxGuesses))
      : 6;
  return { kind: "MYSTERY", targetPlayerId: o.targetPlayerId, maxGuesses };
}

export function parseMysteryHalfLog(raw: unknown): MysteryHalfLog | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MysteryHalfLog>;
  if (!Array.isArray(o.guesses)) return null;
  const status =
    o.status === "SOLVED" || o.status === "FAILED" || o.status === "IN_PROGRESS"
      ? o.status
      : null;
  if (!status) return null;
  return {
    guesses: o.guesses as MysteryGuessRecord[],
    status,
    score: typeof o.score === "number" ? Math.max(0, o.score) : 0,
  };
}

/** Score: leftover guesses * 20, or 0 on fail. */
export function mysteryDuelScore(
  maxGuesses: number,
  guessesUsed: number,
  solved: boolean,
): number {
  if (!solved) return 0;
  const left = Math.max(0, maxGuesses - guessesUsed + 1);
  return left * 20;
}
