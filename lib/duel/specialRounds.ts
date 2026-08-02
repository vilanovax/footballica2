import type { SpecialDuelRoundType } from "@/lib/game/liveModes";
import { isSpecialDuelRoundType } from "@/lib/game/liveModes";

/** True when this duel already locked any special (non-QUIZ) round. */
export function duelHasSpecialRound(
  rounds: { roundType: string }[],
): boolean {
  return rounds.some((r) => isSpecialDuelRoundType(r.roundType));
}

export function specialRoundTypeOf(
  rounds: { roundType: string }[],
): SpecialDuelRoundType | null {
  for (const r of rounds) {
    if (isSpecialDuelRoundType(r.roundType)) return r.roundType;
  }
  return null;
}

/** @deprecated Prefer duelHasSpecialRound — Memory is one of several specials. */
export function duelHasMemoryRound(
  rounds: { roundType: string }[],
): boolean {
  return rounds.some((r) => r.roundType === "MEMORY");
}
