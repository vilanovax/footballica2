import type { DuelSnapshot, DuelRoundSnapshot } from "@/lib/duel/snapshot";
import { viewerMatchScore } from "@/lib/duel/matchScore";
import { DUEL_ROUND_COUNT } from "@/lib/duel/types";
import type {
  ScorecardAnswer,
  ScorecardData,
  ScorecardMatchStatus,
  ScorecardOutcome,
  ScorecardRound,
} from "@/lib/duel/scorecardTypes";

const DEFAULT_SLOTS = 5;

function padAnswers(
  results: boolean[] | null,
  slots: number,
): ScorecardAnswer[] {
  const n = Math.max(slots, results?.length ?? 0, DEFAULT_SLOTS);
  return Array.from({ length: n }, (_, i) => {
    const v = results?.[i];
    if (v === true || v === false) return v;
    return null;
  });
}

function viewerId(duel: DuelSnapshot): string | null {
  if (duel.youAre === "challenger") return duel.challengerId;
  if (duel.youAre === "opponent") return duel.opponentId;
  return null;
}

function sidesForRound(
  duel: DuelSnapshot,
  round: DuelRoundSnapshot,
): { you: boolean[] | null; them: boolean[] | null } {
  const youId = viewerId(duel);
  const youAttack = youId != null && round.attackerId === youId;
  if (youAttack) {
    return { you: round.attackResults, them: round.defenseResults };
  }
  return { you: round.defenseResults, them: round.attackResults };
}

function matchStatus(duel: DuelSnapshot): ScorecardMatchStatus {
  if (
    duel.status === "COMPLETED" ||
    duel.status === "EXPIRED" ||
    duel.status === "FORFEIT"
  ) {
    return "COMPLETED";
  }

  const yourTurn =
    duel.canAct ||
    (duel.status === "WAITING_A" && duel.youAre === "challenger") ||
    (duel.status === "WAITING_B" && duel.youAre === "opponent");

  return yourTurn ? "YOUR_TURN" : "WAITING";
}

function outcomeFor(duel: DuelSnapshot): ScorecardOutcome {
  if (
    duel.status !== "COMPLETED" &&
    duel.status !== "EXPIRED" &&
    duel.status !== "FORFEIT"
  ) {
    return null;
  }
  if (duel.winnerId == null) return "DRAW";
  const youId = viewerId(duel);
  if (youId != null && duel.winnerId === youId) return "WIN";
  return "LOSE";
}

function mapRound(
  duel: DuelSnapshot,
  round: DuelRoundSnapshot | null,
  roundNumber: number,
): ScorecardRound {
  if (!round) {
    return {
      roundNumber,
      roundType: "QUIZ",
      categoryNameEn: "",
      categoryNameFa: "",
      youAnswers: padAnswers(null, DEFAULT_SLOTS),
      themAnswers: padAnswers(null, DEFAULT_SLOTS),
      locked: true,
    };
  }

  const { you, them } = sidesForRound(duel, round);
  const isMemory = round.roundType === "MEMORY";
  const slots = isMemory
    ? Math.max(round.questionCount, 8)
    : Math.max(round.questionCount, DEFAULT_SLOTS);
  const youId = viewerId(duel);
  const youAttack = youId != null && round.attackerId === youId;

  // Rival still owes defense after your attack (classic "opponent's turn" cell).
  const waitingOnThem =
    youAttack && round.attackSubmitted && !round.defenseSubmitted;

  return {
    roundNumber,
    roundType: isMemory ? "MEMORY" : "QUIZ",
    categoryNameEn: round.categoryNameEn ?? (isMemory ? "Memory Pairs" : ""),
    categoryNameFa: round.categoryNameFa ?? (isMemory ? "حافظه جفت‌ها" : ""),
    youAnswers: padAnswers(you, slots),
    themAnswers: padAnswers(them, slots),
    waitingOnThem,
    locked: false,
  };
}

/**
 * Maps a live `DuelSnapshot` into the Scorecard presentation model.
 */
export function toScorecard(
  duel: DuelSnapshot,
  fallbacks?: { yourName?: string | null; yourAvatar?: string | null },
): ScorecardData {
  const youParty =
    duel.youAre === "challenger" ? duel.challenger : duel.opponent;
  const themParty =
    duel.youAre === "challenger" ? duel.opponent : duel.challenger;

  // Headline score = rounds won (e.g. 2–0), not total correct answers.
  const { you: youScore, them: themScore } = viewerMatchScore(duel);

  const roundsByNum = new Map(duel.rounds.map((r) => [r.roundNumber, r]));
  const rounds = Array.from({ length: DUEL_ROUND_COUNT }, (_, i) => {
    const n = i + 1;
    return mapRound(duel, roundsByNum.get(n) ?? null, n);
  });

  return {
    status: matchStatus(duel),
    outcome: outcomeFor(duel),
    you: {
      name: youParty?.name ?? fallbacks?.yourName ?? "—",
      avatarKey: youParty?.avatar ?? fallbacks?.yourAvatar ?? "TACTICAL_COACH",
      colorKey: youParty?.colorKey ?? null,
      level: youParty?.level ?? 1,
    },
    them: {
      name: themParty?.name ?? (duel.isBotOpponent ? "Bot" : "—"),
      avatarKey: themParty?.avatar ?? "YOUNG_DIRECTOR",
      colorKey: themParty?.colorKey ?? null,
      level: themParty?.level ?? 1,
      isBot: themParty?.isBot ?? duel.isBotOpponent,
    },
    youScore,
    themScore,
    rounds,
  };
}
