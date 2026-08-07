import type { GameConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";

/** Permanent perk pick at facility milestone levels (ADR 003 follow-up). */
export type FacilityBranch = "SPEED" | "WAREHOUSE" | "PREMIUM";

export const FACILITY_BRANCHES: FacilityBranch[] = [
  "SPEED",
  "WAREHOUSE",
  "PREMIUM",
];

export function isFacilityBranch(raw: unknown): raw is FacilityBranch {
  return (
    typeof raw === "string" &&
    (FACILITY_BRANCHES as string[]).includes(raw)
  );
}

/** Parse persisted JSON / unknown into a clean pick list. */
export function parseBranchPicks(raw: unknown): FacilityBranch[] {
  if (!Array.isArray(raw)) return [];
  const out: FacilityBranch[] = [];
  for (const item of raw) {
    if (isFacilityBranch(item)) out.push(item);
  }
  return out;
}

export function branchMilestones(
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number[] {
  return config.businessEconomy.branchMilestones;
}

/** True when leveling up to `nextLevel` requires a branch pick. */
export function isBranchMilestone(
  nextLevel: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): boolean {
  return branchMilestones(config).includes(nextLevel);
}

/**
 * How many milestone picks a facility at `level` should already have.
 * e.g. milestones [5,10,15], level 10 → 2 picks.
 */
export function expectedBranchPickCount(
  level: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  return branchMilestones(config).filter((m) => m <= level).length;
}

export type BranchModifiers = {
  /** Multiplier on facility rate (1 = unchanged). */
  rateMult: number;
  /** Multiplier on buffer storage hours (1 = unchanged). */
  hoursMult: number;
};

/**
 * Stack branch picks into rate/hours multipliers.
 * SPEED — faster income, slightly smaller buffer hours.
 * WAREHOUSE — bigger buffer, rate unchanged.
 * PREMIUM — balanced bump to both.
 */
export function branchModifiers(
  picks: FacilityBranch[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): BranchModifiers {
  const per = config.businessEconomy.branchPerks;
  let rateMult = 1;
  let hoursMult = 1;
  for (const pick of picks) {
    if (pick === "SPEED") {
      rateMult *= 1 + per.speed.rateBonus;
      hoursMult *= 1 + per.speed.hoursBonus;
    } else if (pick === "WAREHOUSE") {
      rateMult *= 1 + per.warehouse.rateBonus;
      hoursMult *= 1 + per.warehouse.hoursBonus;
    } else {
      rateMult *= 1 + per.premium.rateBonus;
      hoursMult *= 1 + per.premium.hoursBonus;
    }
  }
  return { rateMult, hoursMult };
}

/** Display helper — total rate % from picks (approximate additive display). */
export function branchRateBonusPercent(
  picks: FacilityBranch[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const { rateMult } = branchModifiers(picks, config);
  return Math.round((rateMult - 1) * 100);
}

export function branchHoursBonusPercent(
  picks: FacilityBranch[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const { hoursMult } = branchModifiers(picks, config);
  return Math.round((hoursMult - 1) * 100);
}
