export {
  DUEL_ROUND_COUNT,
  DUEL_HISTORY_HOURS,
  DUEL_HISTORY_LIMIT,
  DUEL_TERMINAL,
  isDuelTerminal,
  type DuelActor,
  type DuelAnswerLogEntry,
  type DuelAnswerSubmission,
  type DuelTurnKind,
  type DuelTurnView,
} from "@/lib/duel/types";

export {
  duelHistoryCutoff,
  duelViewerOutcome,
  pickActiveDuels,
  pickDuelHistory,
} from "@/lib/duel/history";

export {
  actorForUser,
  assertValidRoundNumber,
  canUserAct,
  describeTurn,
  statusAfterAttackSubmit,
  statusAfterDefendSubmit,
  statusWhenStartingDefend,
  turnKindKey,
} from "@/lib/duel/fsm";

export {
  countCorrect,
  resolveDuelWinner,
  tallyRoundWins,
} from "@/lib/duel/scoring";
export { duelRoundWins, viewerMatchScore } from "@/lib/duel/matchScore";
export { assertNoDuelBoosters } from "@/lib/duel/fairPlay";

export type { DuelCategoryOption } from "@/lib/duel/types";
export type { DuelSnapshot, DuelRoundSnapshot } from "@/lib/duel/snapshot";
