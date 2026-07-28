/**
 * Pure upgrade impact math for Hub cards / sheets.
 * Mirrors what upgradeClub / stamina regen actually apply — never invent UI-only numbers.
 */

import type { UpgradeKey } from "@/lib/club/upgrades";
import { staminaRegenIntervalMinutes } from "@/lib/club/stamina";

/** Soft fan capacity shown on the stadium (grows with stadium upgrades). */
export function fansSoftCap(stadiumLevel: number): number {
  return 25 + Math.max(0, stadiumLevel) * 25;
}

export type UpgradeImpact = {
  /** Stable i18n key under upgrades.impact.* */
  kind: "maxStamina" | "fansCap" | "stadiumTier" | "regenMinutes";
  from: number;
  to: number;
};

/**
 * Numerical before→after for the next level of an upgrade track.
 * Returns null when the track is already maxed (caller passes nextLevel null).
 */
export function getUpgradeImpact(
  key: UpgradeKey,
  currentLevel: number,
  currentMaxStamina: number,
): UpgradeImpact | null {
  const next = currentLevel + 1;
  switch (key) {
    case "TRAINING_GROUND":
      // Authoritative: upgradeClub increments maxStamina by 1.
      return {
        kind: "maxStamina",
        from: currentMaxStamina,
        to: currentMaxStamina + 1,
      };
    case "STADIUM":
      return {
        kind: "fansCap",
        from: fansSoftCap(currentLevel),
        to: fansSoftCap(next),
      };
    case "MEDICAL":
      // Authoritative: computeStaminaRegen uses staminaRegenIntervalMs(level).
      return {
        kind: "regenMinutes",
        from: staminaRegenIntervalMinutes(currentLevel),
        to: staminaRegenIntervalMinutes(next),
      };
    default:
      return null;
  }
}
