import type { DuelStatus } from "@/generated/prisma/client";

/**
 * Map whose Tiki-Taka mini-turn it is onto existing DuelStatus values
 * so async WAITING_* / begin-turn still works.
 *
 * Important: describeTurn maps WAITING_A / A_DEFENDING → round 2.
 * On round 1 we must NEVER use those — send the challenger back to
 * A_ATTACKING for subsequent mini-turns instead.
 */
export function waitingStatusForTikiOwner(opts: {
  roundNumber: number;
  nextOwnerId: string;
  challengerId: string;
  opponentId: string;
}): DuelStatus {
  const nextIsChallenger = opts.nextOwnerId === opts.challengerId;
  if (opts.roundNumber === 1) {
    return nextIsChallenger ? "A_ATTACKING" : "WAITING_B";
  }
  // Round 2 — opponent is the attack owner in the classic FSM.
  return nextIsChallenger ? "WAITING_A" : "B_ATTACKING";
}

export function activeStatusForTikiOwner(opts: {
  roundNumber: number;
  ownerId: string;
  challengerId: string;
  opponentId: string;
}): DuelStatus {
  const isChallenger = opts.ownerId === opts.challengerId;
  if (opts.roundNumber === 1) {
    return isChallenger ? "A_ATTACKING" : "B_DEFENDING";
  }
  return isChallenger ? "A_DEFENDING" : "B_ATTACKING";
}
