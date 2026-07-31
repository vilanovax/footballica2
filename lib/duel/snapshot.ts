import type {
  DuelMatch,
  DuelRound,
  DuelRoundType,
  Category,
  User,
} from "@/generated/prisma/client";
import { describeTurn, isDuelTerminal, type DuelTurnView } from "@/lib/duel";
import type { DuelAnswerLogEntry, DuelCategoryOption } from "@/lib/duel/types";
import {
  isMemoryAttemptLog,
  parseMemoryBoard,
  MEMORY_SUBMIT_GRACE_MS,
  type MemoryBoardJson,
} from "@/lib/duel/memoryTypes";

export type DuelPartySnapshot = {
  id: string;
  name: string;
  avatar: string | null;
  /** Club brand palette key for scoped accents. */
  colorKey: string | null;
  isBot: boolean;
  /** Manager level for scorecard badges. */
  level: number;
};

export type DuelRoundSnapshot = {
  roundNumber: number;
  attackerId: string;
  roundType: DuelRoundType;
  categoryId: string | null;
  categoryNameEn: string | null;
  categoryNameFa: string | null;
  draftOptionIds: string[];
  questionIds: string[] | null;
  /** Length of the attack question set (0 if not locked yet). MEMORY = pairCount. */
  questionCount: number;
  /** Shared MEMORY board (null for QUIZ). Safe for client play. */
  board: MemoryBoardJson | null;
  attackCorrect: number;
  defenseCorrect: number;
  attackSubmitted: boolean;
  defenseSubmitted: boolean;
  /** ISO when MEMORY clock started for attack / defend half. */
  attackStartedAt: string | null;
  defenseStartedAt: string | null;
  /** Per-question (or per-pair) correctness for the attacker (null if not submitted). */
  attackResults: boolean[] | null;
  /** Per-question (or per-pair) correctness for the defender (null if not submitted). */
  defenseResults: boolean[] | null;
};

export type DuelSnapshot = {
  id: string;
  status: DuelMatch["status"];
  isBotOpponent: boolean;
  shadowBotActive: boolean;
  /** Set when this viewer (or anyone) timed out — AFK sees timeout loss copy. */
  timeoutUserId: string | null;
  challengerId: string;
  opponentId: string | null;
  challengerCorrect: number;
  opponentCorrect: number;
  winnerId: string | null;
  turnUserId: string | null;
  turnDeadlineAt: string | null;
  botPlayAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  turn: DuelTurnView;
  /** True when the viewing user may submit an action now. */
  canAct: boolean;
  /** Viewer was the AFK who timed out (hide shadow-bot illusion). */
  youTimedOut: boolean;
  youAre: "challenger" | "opponent" | "spectator";
  rounds: DuelRoundSnapshot[];
  /** Draft categories for the active attack round (when picking). */
  draftOptions?: DuelCategoryOption[];
  /**
   * Attacker may lock Memory on this draft turn — false once any round
   * in the duel is already MEMORY (one Memory pick per match).
   */
  memoryAvailable: boolean;
  challenger: DuelPartySnapshot | null;
  opponent: DuelPartySnapshot | null;
};

type RoundWithCat = DuelRound & { category: Category | null };

type UserWithClub = User & {
  club: { name: string; avatar: string | null; colorKey: string } | null;
};

function parseAnswerResults(raw: unknown): boolean[] | null {
  if (isMemoryAttemptLog(raw)) {
    const total = Math.max(raw.pairCount, raw.pairsFound);
    return Array.from({ length: total }, (_, i) => i < raw.pairsFound);
  }
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((entry) => {
    const e = entry as Partial<DuelAnswerLogEntry>;
    return Boolean(e?.correct);
  });
}

function partyFromUser(user: UserWithClub | null | undefined): DuelPartySnapshot | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.club?.name ?? user.displayName ?? "—",
    avatar: user.club?.avatar ?? user.managerAvatar ?? null,
    colorKey: user.club?.colorKey ?? null,
    isBot: user.isBot,
    level: user.managerLevel ?? 1,
  };
}

export function toDuelSnapshot(
  duel: DuelMatch & {
    rounds: RoundWithCat[];
    challenger?: UserWithClub | null;
    opponent?: UserWithClub | null;
  },
  viewerId: string,
  draftOptions?: DuelCategoryOption[],
): DuelSnapshot {
  const turn = describeTurn(duel.status);
  const youAre =
    viewerId === duel.challengerId
      ? "challenger"
      : duel.opponentId && viewerId === duel.opponentId
        ? "opponent"
        : "spectator";

  const timeoutUserId =
    "timeoutUserId" in duel && typeof duel.timeoutUserId === "string"
      ? duel.timeoutUserId
      : null;
  const shadowBotActive = Boolean(
    "shadowBotActive" in duel && duel.shadowBotActive,
  );
  const youTimedOut = timeoutUserId === viewerId;
  const canAct =
    !isDuelTerminal(duel.status) &&
    !youTimedOut &&
    duel.turnUserId === viewerId &&
    (turn.kind === "attack" || turn.kind === "defend");

  const activeRound =
    turn.roundNumber != null
      ? duel.rounds.find((r) => r.roundNumber === turn.roundNumber)
      : null;
  const memoryUsed = duel.rounds.some((r) => r.roundType === "MEMORY");
  const questionsLocked =
    Array.isArray(activeRound?.questionIds) &&
    (activeRound!.questionIds as unknown[]).length > 0;
  const memoryAvailable =
    turn.kind === "attack" &&
    activeRound != null &&
    activeRound.roundType === "QUIZ" &&
    !memoryUsed &&
    !questionsLocked &&
    !activeRound.attackSubmittedAt;

  return {
    id: duel.id,
    status: duel.status,
    isBotOpponent: duel.isBotOpponent,
    shadowBotActive,
    timeoutUserId,
    challengerId: duel.challengerId,
    opponentId: duel.opponentId,
    challengerCorrect: duel.challengerCorrect,
    opponentCorrect: duel.opponentCorrect,
    winnerId: duel.winnerId,
    turnUserId: duel.turnUserId,
    turnDeadlineAt: duel.turnDeadlineAt?.toISOString() ?? null,
    botPlayAt: duel.botPlayAt?.toISOString() ?? null,
    finishedAt: duel.finishedAt?.toISOString() ?? null,
    createdAt: duel.createdAt.toISOString(),
    turn,
    canAct,
    youTimedOut,
    youAre,
    draftOptions,
    memoryAvailable,
    challenger: partyFromUser(duel.challenger),
    opponent: partyFromUser(duel.opponent),
    rounds: duel.rounds
      .slice()
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((r) => {
        const questionIds = Array.isArray(r.questionIds)
          ? (r.questionIds as string[])
          : null;
        const board =
          r.roundType === "MEMORY" ? parseMemoryBoard(r.boardJson) : null;
        const isMemory = r.roundType === "MEMORY";
        return {
          roundNumber: r.roundNumber,
          attackerId: r.attackerId,
          roundType: r.roundType,
          categoryId: r.categoryId,
          categoryNameEn: isMemory
            ? "Memory Pairs"
            : (r.category?.nameEn ?? null),
          categoryNameFa: isMemory
            ? "حافظه جفت‌ها"
            : (r.category?.nameFa ?? null),
          draftOptionIds: Array.isArray(r.draftOptionIds)
            ? (r.draftOptionIds as string[])
            : [],
          questionIds,
          questionCount: isMemory
            ? (board?.pairCount ?? 0)
            : (questionIds?.length ?? 0),
          board,
          attackCorrect: r.attackCorrect,
          defenseCorrect: r.defenseCorrect,
          attackSubmitted: Boolean(r.attackSubmittedAt),
          defenseSubmitted: Boolean(r.defenseSubmittedAt),
          attackStartedAt: r.attackStartedAt?.toISOString() ?? null,
          defenseStartedAt: r.defenseStartedAt?.toISOString() ?? null,
          attackResults: parseAnswerResults(r.attackAnswers),
          defenseResults: parseAnswerResults(r.defenseAnswers),
        };
      }),
  };
}

/** Re-export grace for clients that mirror server deadline math. */
export { MEMORY_SUBMIT_GRACE_MS };
