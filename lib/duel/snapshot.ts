import type {
  DuelMatch,
  DuelRound,
  DuelRoundType,
  Category,
  User,
} from "@/generated/prisma/client";
import { describeTurn } from "@/lib/duel/fsm";
import { isDuelTerminal, type DuelTurnView } from "@/lib/duel/types";
import type { DuelAnswerLogEntry, DuelCategoryOption } from "@/lib/duel/types";
import {
  isMemoryAttemptLog,
  parseMemoryBoard,
  MEMORY_SUBMIT_GRACE_MS,
  type MemoryBoardJson,
} from "@/lib/duel/memoryTypes";
import type { LiveModeId } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import {
  duelEnabledModes,
  DUEL_TYPE_TO_LIVE_MODE,
  LIVE_MODE_LABELS,
  isSpecialDuelRoundType,
  liveModesFromConfig,
} from "@/lib/game/liveModes";
import { duelHasSpecialRound } from "@/lib/duel/specialRounds";
import { parseStarPathBoard } from "@/lib/duel/starPathTypes";
import { parseMysteryBoard } from "@/lib/duel/mysteryTypes";
import { parseGridBoard } from "@/lib/duel/gridTypes";

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
  /** MEMORY board when roundType=MEMORY. */
  board: MemoryBoardJson | null;
  /** Frozen special payload (star path / mystery / grid / memory raw). */
  boardJson: unknown | null;
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
  /** In-progress special half answers (guess logs). */
  attackAnswers: unknown | null;
  defenseAnswers: unknown | null;
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
   * @deprecated Use specialAvailable — kept so older clients still show Memory.
   */
  memoryAvailable: boolean;
  /** Admin-enabled specials the attacker may still pick this turn. */
  specialAvailable: LiveModeId[];
  challenger: DuelPartySnapshot | null;
  opponent: DuelPartySnapshot | null;
};

type RoundWithCat = DuelRound & { category: Category | null };

type UserWithClub = User & {
  club: { name: string; avatar: string | null; colorKey: string } | null;
};

export type ToDuelSnapshotOpts = {
  draftOptions?: DuelCategoryOption[];
  /** When omitted, defaults to DEFAULT_GAME_CONFIG.liveModes. */
  liveModes?: typeof DEFAULT_GAME_CONFIG.liveModes;
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

function specialLabels(roundType: DuelRoundType): {
  en: string;
  fa: string;
} | null {
  if (!isSpecialDuelRoundType(roundType)) return null;
  return LIVE_MODE_LABELS[DUEL_TYPE_TO_LIVE_MODE[roundType]];
}

export function toDuelSnapshot(
  duel: DuelMatch & {
    rounds: RoundWithCat[];
    challenger?: UserWithClub | null;
    opponent?: UserWithClub | null;
  },
  viewerId: string,
  draftOptionsOrOpts?: DuelCategoryOption[] | ToDuelSnapshotOpts,
): DuelSnapshot {
  const opts: ToDuelSnapshotOpts = Array.isArray(draftOptionsOrOpts)
    ? { draftOptions: draftOptionsOrOpts }
    : (draftOptionsOrOpts ?? {});
  const liveModes = liveModesFromConfig({
    ...DEFAULT_GAME_CONFIG,
    liveModes: opts.liveModes ?? DEFAULT_GAME_CONFIG.liveModes,
  });
  const draftOptions = opts.draftOptions;

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
  const specialUsed = duelHasSpecialRound(duel.rounds);
  const questionsLocked =
    Array.isArray(activeRound?.questionIds) &&
    (activeRound!.questionIds as unknown[]).length > 0;
  const canPickSpecial =
    turn.kind === "attack" &&
    activeRound != null &&
    activeRound.roundType === "QUIZ" &&
    !specialUsed &&
    !questionsLocked &&
    !activeRound.attackSubmittedAt;

  const specialAvailable: LiveModeId[] = canPickSpecial
    ? duelEnabledModes({ ...DEFAULT_GAME_CONFIG, liveModes })
    : [];

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
    memoryAvailable: specialAvailable.includes("memory"),
    specialAvailable,
    challenger: partyFromUser(duel.challenger),
    opponent: partyFromUser(duel.opponent),
    rounds: duel.rounds
      .slice()
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((r) => {
        const questionIds = Array.isArray(r.questionIds)
          ? (r.questionIds as string[])
          : null;
        const memoryBoard =
          r.roundType === "MEMORY" ? parseMemoryBoard(r.boardJson) : null;
        const labels = specialLabels(r.roundType);
        const starBoard =
          r.roundType === "STAR_PATH" ? parseStarPathBoard(r.boardJson) : null;
        const mysteryBoard =
          r.roundType === "MYSTERY" ? parseMysteryBoard(r.boardJson) : null;
        const gridBoard =
          r.roundType === "GRID" ? parseGridBoard(r.boardJson) : null;

        let questionCount = questionIds?.length ?? 0;
        if (memoryBoard) questionCount = memoryBoard.pairCount;
        else if (starBoard) questionCount = starBoard.maxClues;
        else if (mysteryBoard) questionCount = mysteryBoard.maxGuesses;
        else if (gridBoard) questionCount = 9;
        else if (r.roundType === "TIKI_TAKA") questionCount = 9;

        return {
          roundNumber: r.roundNumber,
          attackerId: r.attackerId,
          roundType: r.roundType,
          categoryId: r.categoryId,
          categoryNameEn: labels?.en ?? r.category?.nameEn ?? null,
          categoryNameFa: labels?.fa ?? r.category?.nameFa ?? null,
          draftOptionIds: Array.isArray(r.draftOptionIds)
            ? (r.draftOptionIds as string[])
            : [],
          questionIds,
          questionCount,
          board: memoryBoard,
          boardJson: r.boardJson ?? null,
          attackCorrect: r.attackCorrect,
          defenseCorrect: r.defenseCorrect,
          attackSubmitted: Boolean(r.attackSubmittedAt),
          defenseSubmitted: Boolean(r.defenseSubmittedAt),
          attackStartedAt: r.attackStartedAt?.toISOString() ?? null,
          defenseStartedAt: r.defenseStartedAt?.toISOString() ?? null,
          attackResults: parseAnswerResults(r.attackAnswers),
          defenseResults: parseAnswerResults(r.defenseAnswers),
          attackAnswers: r.attackAnswers ?? null,
          defenseAnswers: r.defenseAnswers ?? null,
        };
      }),
  };
}

/** Re-export grace for clients that mirror server deadline math. */
export { MEMORY_SUBMIT_GRACE_MS };
