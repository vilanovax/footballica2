import type { DuelRoundSnapshot, DuelSnapshot } from "@/lib/duel/snapshot";
import { tallyRoundWins } from "@/lib/duel/scoring";

function toRoundInput(
  round: DuelRoundSnapshot,
  challengerId: string,
): Parameters<typeof tallyRoundWins>[0][number] {
  void challengerId;
  return {
    attackerId: round.attackerId,
    attackCorrect: round.attackCorrect,
    defenseCorrect: round.defenseCorrect,
    complete: round.attackSubmitted && round.defenseSubmitted,
  };
}

/** Challenger / opponent round-win tally for a live snapshot. */
export function duelRoundWins(duel: DuelSnapshot): {
  challenger: number;
  opponent: number;
} {
  return tallyRoundWins(
    duel.rounds.map((r) => toRoundInput(r, duel.challengerId)),
    duel.challengerId,
  );
}

/**
 * Match scoreline from the viewer's POV — rounds won, not total goals.
 * (Goals stay visible inside each round row via the ball pips.)
 */
export function viewerMatchScore(duel: DuelSnapshot): {
  you: number;
  them: number;
} {
  const wins = duelRoundWins(duel);
  if (duel.youAre === "challenger") {
    return { you: wins.challenger, them: wins.opponent };
  }
  if (duel.youAre === "opponent") {
    return { you: wins.opponent, them: wins.challenger };
  }
  return { you: wins.challenger, them: wins.opponent };
}
