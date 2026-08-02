import type { DuelStatus } from "@/generated/prisma/client";

/** Canonical order for the 2-round light duel (each player attacks once). */
export const DUEL_ROUND_COUNT = 2;

/** Lobby / Match Day: keep finished fixtures visible this long. */
export const DUEL_HISTORY_HOURS = 24;
/** Cap recent finished fixtures shown in UI (newest first). */
export const DUEL_HISTORY_LIMIT = 5;

/** Category chip shown in the draft picker (safe for client components). */
export type DuelCategoryOption = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  icon: string | null;
  questionCount: number;
};

/** Client submission before server grading. */
export type DuelAnswerSubmission = {
  questionId: string;
  selectedIndex: number;
  ms?: number;
};

/** One recorded answer inside a DuelRound attack/defense log. */
export type DuelAnswerLogEntry = {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  /** Client-reported think time in ms (audit only — never trust for scoring). */
  ms?: number;
};

/** Who is expected to act for a given non-terminal status. */
export type DuelActor = "challenger" | "opponent" | "none";

export type DuelTurnKind =
  | "match"
  | "attack" // draft category + answer own 5
  | "defend" // answer opponent's 5
  | "wait"
  | "done";

export type DuelTurnView = {
  status: DuelStatus;
  actor: DuelActor;
  kind: DuelTurnKind;
  /** Round number the actor is operating on (1 or 2), when applicable. */
  roundNumber: number | null;
};

/** Terminal statuses — no further player input. */
export const DUEL_TERMINAL: ReadonlySet<DuelStatus> = new Set([
  "COMPLETED",
  "EXPIRED",
  "FORFEIT",
]);

export function isDuelTerminal(status: DuelStatus): boolean {
  return DUEL_TERMINAL.has(status);
}

/** Tiki-Taka boardJson shapes (shared PvP grid round). */
export type {
  TikiTakaBoardJson,
  TikiTakaCellState,
  TikiTakaMoveLog,
} from "@/lib/duel/tikiTakaTypes";
