import type { DuelStatus } from "@/generated/prisma/client";
import {
  DUEL_ROUND_COUNT,
  isDuelTerminal,
  type DuelActor,
  type DuelTurnKind,
  type DuelTurnView,
} from "@/lib/duel/types";

/**
 * Pure state-machine helpers for Draft Duel (2 light rounds).
 *
 * Happy path:
 *   MATCHING → A_ATTACKING → WAITING_B → B_DEFENDING → B_ATTACKING
 *            → WAITING_A → A_DEFENDING → COMPLETED
 */

export function describeTurn(status: DuelStatus): DuelTurnView {
  switch (status) {
    case "MATCHING":
      return { status, actor: "none", kind: "match", roundNumber: null };
    case "A_ATTACKING":
      return { status, actor: "challenger", kind: "attack", roundNumber: 1 };
    case "WAITING_B":
      return { status, actor: "opponent", kind: "wait", roundNumber: 1 };
    case "B_DEFENDING":
      return { status, actor: "opponent", kind: "defend", roundNumber: 1 };
    case "B_ATTACKING":
      return { status, actor: "opponent", kind: "attack", roundNumber: 2 };
    case "WAITING_A":
      return { status, actor: "challenger", kind: "wait", roundNumber: 2 };
    case "A_DEFENDING":
      return { status, actor: "challenger", kind: "defend", roundNumber: 2 };
    case "COMPLETED":
    case "EXPIRED":
    case "FORFEIT":
      return { status, actor: "none", kind: "done", roundNumber: null };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** After the attacker submits draft + answers for the given round. */
export function statusAfterAttackSubmit(roundNumber: number): DuelStatus {
  if (roundNumber === 1) return "WAITING_B";
  if (roundNumber === 2) return "WAITING_A";
  throw new Error(`Invalid attack round ${roundNumber}`);
}

/**
 * After the defender finishes answering the attacker's questions.
 * Round 1 → opponent starts their attack. Round 2 → duel complete.
 */
export function statusAfterDefendSubmit(roundNumber: number): DuelStatus {
  if (roundNumber === 1) return "B_ATTACKING";
  if (roundNumber === 2) return "COMPLETED";
  throw new Error(`Invalid defend round ${roundNumber}`);
}

/** Claim a waiting status into the active defend status (when opponent opens the turn). */
export function statusWhenStartingDefend(from: DuelStatus): DuelStatus | null {
  if (from === "WAITING_B") return "B_DEFENDING";
  if (from === "WAITING_A") return "A_DEFENDING";
  return null;
}

/** True when `userId` is allowed to submit for this duel status. */
export function canUserAct(params: {
  status: DuelStatus;
  userId: string;
  challengerId: string;
  opponentId: string | null;
}): boolean {
  if (isDuelTerminal(params.status)) return false;
  const turn = describeTurn(params.status);
  if (turn.actor === "none" || turn.kind === "wait" || turn.kind === "match") {
    return false;
  }
  if (turn.actor === "challenger") return params.userId === params.challengerId;
  if (turn.actor === "opponent") {
    return params.opponentId !== null && params.userId === params.opponentId;
  }
  return false;
}

/** Resolve actor label for a user id within a duel. */
export function actorForUser(
  userId: string,
  challengerId: string,
  opponentId: string | null,
): DuelActor {
  if (userId === challengerId) return "challenger";
  if (opponentId && userId === opponentId) return "opponent";
  return "none";
}

export function assertValidRoundNumber(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > DUEL_ROUND_COUNT) {
    throw new Error(`Round must be 1..${DUEL_ROUND_COUNT}, got ${n}`);
  }
}

/** Map turn kind to a short machine key (useful for i18n later). */
export function turnKindKey(kind: DuelTurnKind): string {
  return kind;
}
