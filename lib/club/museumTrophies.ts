import type { GameConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";

/** Trophy rate factor from owned ClubBadge count (1.0 = no bonus). */
export function museumTrophyFactor(
  badgeCount: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const { percentPerBadge, bonusCapPercent } = config.businessEconomy.museumTrophy;
  const bonusPct = Math.min(
    bonusCapPercent,
    Math.max(0, badgeCount) * percentPerBadge,
  );
  return 1 + bonusPct / 100;
}

/** Display helper — total trophy bonus percent after cap. */
export function museumTrophyBonusPercent(
  badgeCount: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const { percentPerBadge, bonusCapPercent } = config.businessEconomy.museumTrophy;
  return Math.min(
    bonusCapPercent,
    Math.max(0, badgeCount) * percentPerBadge,
  );
}
