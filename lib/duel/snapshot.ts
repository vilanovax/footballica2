import type { DuelMatch, DuelRound, Category, User } from "@/generated/prisma/client";
import { describeTurn, isDuelTerminal, type DuelTurnView } from "@/lib/duel";
import type { DuelAnswerLogEntry, DuelCategoryOption } from "@/lib/duel/types";

export type DuelPartySnapshot = {
  id: string;
  name: string;
  avatar: string | null;
  isBot: boolean;
  /** Manager level for scorecard badges. */
  level: number;
};

export type DuelRoundSnapshot = {
  roundNumber: number;
  attackerId: string;
  categoryId: string | null;
  categoryNameEn: string | null;
  categoryNameFa: string | null;
  draftOptionIds: string[];
  questionIds: string[] | null;
  /** Length of the attack question set (0 if not locked yet). */
  questionCount: number;
  attackCorrect: number;
  defenseCorrect: number;
  attackSubmitted: boolean;
  defenseSubmitted: boolean;
  /** Per-question correctness for the attacker (null if not submitted). */
  attackResults: boolean[] | null;
  /** Per-question correctness for the defender (null if not submitted). */
  defenseResults: boolean[] | null;
};

export type DuelSnapshot = {
  id: string;
  status: DuelMatch["status"];
  isBotOpponent: boolean;
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
  youAre: "challenger" | "opponent" | "spectator";
  rounds: DuelRoundSnapshot[];
  /** Draft categories for the active attack round (when picking). */
  draftOptions?: DuelCategoryOption[];
  challenger: DuelPartySnapshot | null;
  opponent: DuelPartySnapshot | null;
};

type RoundWithCat = DuelRound & { category: Category | null };

type UserWithClub = User & {
  club: { name: string; avatar: string | null } | null;
};

function parseAnswerResults(raw: unknown): boolean[] | null {
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

  const canAct =
    !isDuelTerminal(duel.status) &&
    duel.turnUserId === viewerId &&
    (turn.kind === "attack" || turn.kind === "defend");

  return {
    id: duel.id,
    status: duel.status,
    isBotOpponent: duel.isBotOpponent,
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
    youAre,
    draftOptions,
    challenger: partyFromUser(duel.challenger),
    opponent: partyFromUser(duel.opponent),
    rounds: duel.rounds
      .slice()
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((r) => {
        const questionIds = Array.isArray(r.questionIds)
          ? (r.questionIds as string[])
          : null;
        return {
          roundNumber: r.roundNumber,
          attackerId: r.attackerId,
          categoryId: r.categoryId,
          categoryNameEn: r.category?.nameEn ?? null,
          categoryNameFa: r.category?.nameFa ?? null,
          draftOptionIds: Array.isArray(r.draftOptionIds)
            ? (r.draftOptionIds as string[])
            : [],
          questionIds,
          questionCount: questionIds?.length ?? 0,
          attackCorrect: r.attackCorrect,
          defenseCorrect: r.defenseCorrect,
          attackSubmitted: Boolean(r.attackSubmittedAt),
          defenseSubmitted: Boolean(r.defenseSubmittedAt),
          attackResults: parseAnswerResults(r.attackAnswers),
          defenseResults: parseAnswerResults(r.defenseAnswers),
        };
      }),
  };
}
