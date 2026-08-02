// Pure Club Funds / business-facility math (ADR 003).
// Framework-free — shared by server actions and Hub preview.

import type { GameConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";

export type BusinessFacilityKey = "TICKET_OFFICE" | "CLUB_SHOP" | "MUSEUM";

export const BUSINESS_FACILITY_KEYS: BusinessFacilityKey[] = [
  "TICKET_OFFICE",
  "CLUB_SHOP",
  "MUSEUM",
];

export type FacilityStatus = "LOCKED" | "AVAILABLE" | "BUILT";

export type FacilityDefinition = {
  key: BusinessFacilityKey;
  unlockPlayerLevel: number;
  baseBuildCost: number;
  baseRatePerHour: number;
  /** Buffer capacity as hours of income at the current rate. */
  baseStorageHours: number;
  costGrowth: number;
  rateGrowth: number;
  capGrowth: number;
  maxLevel: number;
  /** Shop applies fans multiplier; others use 1. */
  usesFansFactor: boolean;
};

export type FacilityRow = {
  key: BusinessFacilityKey;
  status: FacilityStatus;
  level: number;
  storedAmount: number;
  lastCalculatedAt: Date | string;
  version: number;
};

export type FacilityView = {
  key: BusinessFacilityKey;
  status: FacilityStatus;
  level: number;
  unlockPlayerLevel: number;
  storedAmount: number;
  ratePerHour: number;
  storageCap: number;
  /** 0..1 fill of the facility buffer. */
  fillRatio: number;
  /** Ms until buffer is full at current rate (0 if full / not built). */
  msUntilFull: number;
  buildCost: number | null;
  upgradeCost: number | null;
  canBuild: boolean;
  canUpgrade: boolean;
  version: number;
};

export type BusinessSnapshot = {
  clubFunds: number;
  vaultBalance: number;
  vaultLevel: number;
  vaultCap: number;
  /** 0..1 */
  vaultFillRatio: number;
  msUntilVaultFull: number;
  totalRatePerHour: number;
  vaultUpgradeCost: number | null;
  collectableTotal: number;
  facilities: FacilityView[];
  playerLevel: number;
};

const MS_PER_HOUR = 3_600_000;

export function getFacilityDef(
  key: BusinessFacilityKey,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): FacilityDefinition {
  return { key, ...config.businessEconomy.facilities[key] };
}

export function fansFactor(
  fans: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const { shopFansDivisor, shopFansBonusCap } = config.businessEconomy;
  const bonus = Math.min(
    shopFansBonusCap,
    Math.max(0, fans) / Math.max(1, shopFansDivisor),
  );
  return 1 + bonus;
}

export function rateAtLevel(
  def: FacilityDefinition,
  level: number,
  fans: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  if (level < 1) return 0;
  const base =
    def.baseRatePerHour * Math.pow(def.rateGrowth, Math.max(0, level - 1));
  const factor = def.usesFansFactor ? fansFactor(fans, config) : 1;
  return Math.max(0, Math.floor(base * factor));
}

export function storageCapAtLevel(
  def: FacilityDefinition,
  level: number,
  fans: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  if (level < 1) return 0;
  const rate = rateAtLevel(def, level, fans, config);
  const hours =
    def.baseStorageHours * Math.pow(def.capGrowth, Math.max(0, level - 1));
  return Math.max(1, Math.floor(rate * hours));
}

export function buildCost(
  def: FacilityDefinition,
): number {
  return Math.max(0, Math.floor(def.baseBuildCost));
}

export function upgradeCost(
  def: FacilityDefinition,
  currentLevel: number,
): number | null {
  if (currentLevel < 1 || currentLevel >= def.maxLevel) return null;
  // First upgrade from L1 uses growth^0 * scaled base (ADR table).
  const cost =
    def.baseBuildCost > 0
      ? def.baseBuildCost * 2 * Math.pow(def.costGrowth, currentLevel - 1)
      : 200 * Math.pow(def.costGrowth, currentLevel - 1);
  return Math.max(1, Math.round(cost));
}

export function vaultCapHours(
  vaultLevel: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const hours = config.businessEconomy.vault.capHours;
  const idx = Math.min(hours.length - 1, Math.max(0, vaultLevel - 1));
  return hours[idx] ?? 3;
}

export function vaultUpgradeCost(
  vaultLevel: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number | null {
  const { maxLevel, baseCost, costGrowth } = config.businessEconomy.vault;
  if (vaultLevel >= maxLevel) return null;
  return Math.max(
    1,
    Math.round(baseCost * Math.pow(costGrowth, Math.max(0, vaultLevel - 1))),
  );
}

export function vaultCapacity(
  vaultLevel: number,
  totalRatePerHour: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const hours = vaultCapHours(vaultLevel, config);
  const floorRate = Math.max(
    totalRatePerHour,
    config.businessEconomy.facilities.TICKET_OFFICE.baseRatePerHour,
  );
  return Math.max(1, Math.floor(floorRate * hours));
}

/** Accrue facility buffer from lastCalculatedAt → now (capped). */
export function settleFacilityAmount(
  storedAmount: number,
  lastCalculatedAt: Date | string,
  ratePerHour: number,
  storageCap: number,
  now: Date = new Date(),
): { storedAmount: number; generated: number } {
  const last =
    lastCalculatedAt instanceof Date
      ? lastCalculatedAt
      : new Date(lastCalculatedAt);
  const elapsedMs = Math.max(0, now.getTime() - last.getTime());
  const generated = ratePerHour * (elapsedMs / MS_PER_HOUR);
  const next = Math.min(storageCap, storedAmount + generated);
  return {
    storedAmount: Math.floor(next),
    generated: Math.max(0, next - storedAmount),
  };
}

export function msUntilBufferFull(
  storedAmount: number,
  storageCap: number,
  ratePerHour: number,
): number {
  if (ratePerHour <= 0 || storedAmount >= storageCap) return 0;
  const remaining = storageCap - storedAmount;
  return Math.ceil((remaining / ratePerHour) * MS_PER_HOUR);
}

/**
 * Preview Hub state from raw rows + balances (no DB writes).
 * Unlock/status for LOCKED→AVAILABLE is applied by the caller before this,
 * or we derive display status from playerLevel here for LOCKED rows.
 */
export function buildBusinessSnapshot(input: {
  clubFunds: number;
  vaultBalance: number;
  vaultLevel: number;
  fans: number;
  playerLevel: number;
  facilities: FacilityRow[];
  config?: GameConfig;
  now?: Date;
}): BusinessSnapshot {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const now = input.now ?? new Date();
  const byKey = new Map(input.facilities.map((f) => [f.key, f]));

  let totalRate = 0;
  let collectableTotal = 0;
  const views: FacilityView[] = [];

  for (const key of BUSINESS_FACILITY_KEYS) {
    const def = getFacilityDef(key, config);
    const row = byKey.get(key);
    const level = row?.level ?? 0;
    const rawStatus = row?.status ?? "LOCKED";
    const status: FacilityStatus =
      rawStatus === "BUILT"
        ? "BUILT"
        : input.playerLevel >= def.unlockPlayerLevel
          ? "AVAILABLE"
          : "LOCKED";

    const rate =
      status === "BUILT" ? rateAtLevel(def, level, input.fans, config) : 0;
    const cap =
      status === "BUILT"
        ? storageCapAtLevel(def, level, input.fans, config)
        : 0;

    let stored = row?.storedAmount ?? 0;
    if (status === "BUILT" && row) {
      stored = settleFacilityAmount(
        row.storedAmount,
        row.lastCalculatedAt,
        rate,
        cap,
        now,
      ).storedAmount;
    }

    if (status === "BUILT") {
      totalRate += rate;
      collectableTotal += stored;
    }

    const bCost = buildCost(def);
    const uCost = status === "BUILT" ? upgradeCost(def, level) : null;

    views.push({
      key,
      status,
      level: status === "BUILT" ? level : 0,
      unlockPlayerLevel: def.unlockPlayerLevel,
      storedAmount: stored,
      ratePerHour: rate,
      storageCap: cap,
      fillRatio: cap > 0 ? Math.min(1, stored / cap) : 0,
      msUntilFull:
        status === "BUILT" ? msUntilBufferFull(stored, cap, rate) : 0,
      buildCost: status === "AVAILABLE" ? bCost : null,
      upgradeCost: uCost,
      canBuild:
        status === "AVAILABLE" && input.clubFunds >= bCost && bCost >= 0,
      canUpgrade:
        status === "BUILT" &&
        uCost !== null &&
        input.clubFunds >= uCost,
      version: row?.version ?? 0,
    });
  }

  const vCap = vaultCapacity(input.vaultLevel, totalRate, config);
  const vaultSpace = Math.max(0, vCap - input.vaultBalance);
  const msUntilVaultFull =
    totalRate > 0 && vaultSpace > 0
      ? Math.ceil((vaultSpace / totalRate) * MS_PER_HOUR)
      : 0;

  return {
    clubFunds: input.clubFunds,
    vaultBalance: input.vaultBalance,
    vaultLevel: input.vaultLevel,
    vaultCap: vCap,
    vaultFillRatio: vCap > 0 ? Math.min(1, input.vaultBalance / vCap) : 0,
    msUntilVaultFull,
    totalRatePerHour: totalRate,
    vaultUpgradeCost: vaultUpgradeCost(input.vaultLevel, config),
    collectableTotal,
    facilities: views,
    playerLevel: input.playerLevel,
  };
}

/** How much of `amount` fits into the vault. */
export function vaultAccepts(
  vaultBalance: number,
  vaultCap: number,
  amount: number,
): number {
  if (amount <= 0) return 0;
  return Math.max(0, Math.min(amount, vaultCap - vaultBalance));
}
