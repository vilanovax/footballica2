import type { StarPathClubStep, StarPathGuessRecord } from "@/lib/starpath/types";

/** Frozen Star Path payload on DuelRound.boardJson. */
export type StarPathBoardJson = {
  kind: "STAR_PATH";
  targetPlayerId: string;
  path: StarPathClubStep[];
  maxClues: number;
};

export type StarPathHalfLog = {
  guesses: StarPathGuessRecord[];
  cluesRevealed: number;
  status: "SOLVED" | "FAILED" | "IN_PROGRESS";
  score: number;
};

export function parseStarPathBoard(raw: unknown): StarPathBoardJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<StarPathBoardJson>;
  if (o.kind !== "STAR_PATH") return null;
  if (typeof o.targetPlayerId !== "string" || !o.targetPlayerId) return null;
  if (!Array.isArray(o.path) || o.path.length < 1) return null;
  const path = o.path
    .map((s) =>
      s && typeof s === "object" && typeof (s as { name?: unknown }).name === "string"
        ? { name: String((s as { name: string }).name).trim() }
        : null,
    )
    .filter((s): s is StarPathClubStep => Boolean(s?.name));
  if (path.length < 1) return null;
  const maxClues =
    typeof o.maxClues === "number" && o.maxClues >= 1
      ? Math.min(8, Math.floor(o.maxClues))
      : path.length;
  return {
    kind: "STAR_PATH",
    targetPlayerId: o.targetPlayerId,
    path,
    maxClues,
  };
}

export function parseStarPathHalfLog(raw: unknown): StarPathHalfLog | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<StarPathHalfLog>;
  if (!Array.isArray(o.guesses)) return null;
  const status =
    o.status === "SOLVED" || o.status === "FAILED" || o.status === "IN_PROGRESS"
      ? o.status
      : null;
  if (!status) return null;
  return {
    guesses: o.guesses as StarPathGuessRecord[],
    cluesRevealed:
      typeof o.cluesRevealed === "number" ? Math.max(1, o.cluesRevealed) : 1,
    status,
    score: typeof o.score === "number" ? Math.max(0, o.score) : 0,
  };
}
