// Pure Sponsor Office math (ADR 003 follow-up — commercial deals, lazy payout).
// Framework-free — shared by server settle and Hub preview.

import type { GameConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";

const MS_PER_HOUR = 3_600_000;

export type SponsorTier = "BRONZE" | "SILVER" | "GOLD";

export type SponsorTemplate = {
  key: string;
  nameEn: string;
  nameFa: string;
  tier: SponsorTier;
  signCost: number;
  payoutPerTick: number;
  requiresFans: number;
  requiresStadiumLevel: number;
  requiresPlayerLevel: number;
  /** Hours until deal expires; null = until replaced. */
  durationHours: number | null;
  /** Soft facility income bonus while active (% points). */
  facilityRateBonusPercent: number;
};

export type SponsorDealRow = {
  slotIndex: number;
  sponsorKey: string;
  signedAt: Date | string;
  expiresAt: Date | string | null;
};

export type SponsorDealView = {
  slotIndex: number;
  sponsorKey: string;
  nameEn: string;
  nameFa: string;
  tier: SponsorTier;
  payoutPerTick: number;
  facilityRateBonusPercent: number;
  signedAt: string;
  expiresAt: string | null;
  msUntilExpiry: number | null;
  expired: boolean;
};

export type SponsorOfferView = {
  key: string;
  nameEn: string;
  nameFa: string;
  tier: SponsorTier;
  signCost: number;
  payoutPerTick: number;
  facilityRateBonusPercent: number;
  requiresFans: number;
  requiresStadiumLevel: number;
  requiresPlayerLevel: number;
  durationHours: number | null;
  eligible: boolean;
  canAfford: boolean;
  lockedReason: "LEVEL" | "FANS" | "STADIUM" | "FUNDS" | null;
};

export type SponsorOfficeView = {
  enabled: boolean;
  built: boolean;
  level: number;
  maxLevel: number;
  unlockPlayerLevel: number;
  buildCost: number;
  upgradeCost: number | null;
  canBuild: boolean;
  canUpgrade: boolean;
  slots: number;
  deals: SponsorDealView[];
  offers: SponsorOfferView[];
  /** Aggregate facility rate multiplier from active deals (1 = none). */
  facilityRateMult: number;
  facilityBonusPercent: number;
  payoutIntervalHours: number;
  msUntilNextPayout: number | null;
  nextPayoutEstimate: number;
};

export function getSponsorTemplate(
  key: string,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): SponsorTemplate | null {
  return (
    config.businessEconomy.sponsorOffice.sponsors.find((s) => s.key === key) ??
    null
  );
}

export function sponsorSlotsAtLevel(
  level: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  if (level < 1) return 0;
  const by = config.businessEconomy.sponsorOffice.slotsByLevel;
  if (by.length === 0) return 1;
  const idx = Math.min(by.length - 1, level - 1);
  return Math.max(0, by[idx] ?? 1);
}

export function sponsorOfficeUpgradeCost(
  currentLevel: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number | null {
  const so = config.businessEconomy.sponsorOffice;
  if (currentLevel < 1 || currentLevel >= so.maxLevel) return null;
  return Math.max(
    1,
    Math.round(
      so.upgradeBaseCost * Math.pow(so.upgradeCostGrowth, currentLevel - 1),
    ),
  );
}

export function activeSponsorDeals(
  deals: SponsorDealRow[],
  now: Date = new Date(),
): SponsorDealRow[] {
  return deals.filter((d) => {
    if (!d.expiresAt) return true;
    const end =
      d.expiresAt instanceof Date ? d.expiresAt : new Date(d.expiresAt);
    return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime();
  });
}

/** Facility rate multiplier from active deals (capped). */
export function sponsorFacilityRateMult(
  deals: SponsorDealRow[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
  now: Date = new Date(),
): number {
  const so = config.businessEconomy.sponsorOffice;
  if (!so.enabled) return 1;
  let sum = 0;
  for (const d of activeSponsorDeals(deals, now)) {
    const t = getSponsorTemplate(d.sponsorKey, config);
    if (t) sum += Math.max(0, t.facilityRateBonusPercent);
  }
  const capped = Math.min(so.facilityBonusCapPercent, sum);
  return 1 + capped / 100;
}

export function sponsorFacilityBonusPercent(
  deals: SponsorDealRow[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
  now: Date = new Date(),
): number {
  return Math.round((sponsorFacilityRateMult(deals, config, now) - 1) * 100);
}

export type SponsorPayoutSettle = {
  gained: number;
  ticks: number;
  lastAt: Date | null;
  /** Slot indexes whose deals expired and should be removed. */
  expiredSlotIndexes: number[];
};

/**
 * Lazy sponsor payouts into spendable Club Funds (no mint cron).
 * Advances clock even when office empty so re-sign stays in sync.
 */
export function settleSponsorPayouts(input: {
  clubFunds: number;
  officeLevel: number;
  deals: SponsorDealRow[];
  lastPayoutAt: Date | string | null | undefined;
  now?: Date;
  config?: GameConfig;
}): SponsorPayoutSettle & { balance: number } {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const so = config.businessEconomy.sponsorOffice;
  const now = input.now ?? new Date();

  const expiredSlotIndexes = input.deals
    .filter((d) => {
      if (!d.expiresAt) return false;
      const end =
        d.expiresAt instanceof Date ? d.expiresAt : new Date(d.expiresAt);
      return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime();
    })
    .map((d) => d.slotIndex);

  if (!so.enabled || input.officeLevel < 1) {
    return {
      balance: input.clubFunds,
      gained: 0,
      ticks: 0,
      lastAt: input.lastPayoutAt
        ? input.lastPayoutAt instanceof Date
          ? input.lastPayoutAt
          : new Date(input.lastPayoutAt)
        : null,
      expiredSlotIndexes,
    };
  }

  const intervalMs = Math.max(1, so.payoutIntervalHours) * MS_PER_HOUR;
  let last =
    input.lastPayoutAt == null
      ? now
      : input.lastPayoutAt instanceof Date
        ? input.lastPayoutAt
        : new Date(input.lastPayoutAt);
  if (Number.isNaN(last.getTime())) last = now;

  const live = activeSponsorDeals(input.deals, now);
  let bal = Math.max(0, Math.floor(input.clubFunds));
  let gained = 0;
  let ticks = 0;

  while (
    ticks < so.maxCatchupTicks &&
    now.getTime() - last.getTime() >= intervalMs
  ) {
    let tickPay = 0;
    for (const d of live) {
      const t = getSponsorTemplate(d.sponsorKey, config);
      if (t) tickPay += Math.max(0, t.payoutPerTick);
    }
    bal += tickPay;
    gained += tickPay;
    last = new Date(last.getTime() + intervalMs);
    ticks += 1;
  }

  return {
    balance: bal,
    gained,
    ticks,
    lastAt: last,
    expiredSlotIndexes,
  };
}

export function msUntilNextSponsorPayout(
  lastAt: Date | string | null | undefined,
  intervalHours: number,
  now: Date = new Date(),
): number {
  if (!lastAt) return 0;
  const last = lastAt instanceof Date ? lastAt : new Date(lastAt);
  if (Number.isNaN(last.getTime())) return 0;
  const intervalMs = Math.max(1, intervalHours) * MS_PER_HOUR;
  return Math.max(0, last.getTime() + intervalMs - now.getTime());
}

export function dealExpiresAt(
  template: SponsorTemplate,
  signedAt: Date = new Date(),
): Date | null {
  if (template.durationHours == null || template.durationHours <= 0) {
    return null;
  }
  return new Date(
    signedAt.getTime() + template.durationHours * MS_PER_HOUR,
  );
}

export function buildSponsorOfficeView(input: {
  clubFunds: number;
  officeLevel: number;
  playerLevel: number;
  fans: number;
  stadiumLevel: number;
  deals: SponsorDealRow[];
  lastPayoutAt?: Date | string | null;
  config?: GameConfig;
  now?: Date;
}): SponsorOfficeView {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const so = config.businessEconomy.sponsorOffice;
  const now = input.now ?? new Date();
  const built = input.officeLevel >= 1;
  const slots = sponsorSlotsAtLevel(input.officeLevel, config);
  const upCost = sponsorOfficeUpgradeCost(input.officeLevel, config);
  const live = activeSponsorDeals(input.deals, now);

  const deals: SponsorDealView[] = live
    .filter((d) => d.slotIndex < slots)
    .map((d) => {
      const t = getSponsorTemplate(d.sponsorKey, config);
      const end = d.expiresAt
        ? d.expiresAt instanceof Date
          ? d.expiresAt
          : new Date(d.expiresAt)
        : null;
      const signed =
        d.signedAt instanceof Date ? d.signedAt : new Date(d.signedAt);
      return {
        slotIndex: d.slotIndex,
        sponsorKey: d.sponsorKey,
        nameEn: t?.nameEn ?? d.sponsorKey,
        nameFa: t?.nameFa ?? d.sponsorKey,
        tier: t?.tier ?? "BRONZE",
        payoutPerTick: t?.payoutPerTick ?? 0,
        facilityRateBonusPercent: t?.facilityRateBonusPercent ?? 0,
        signedAt: signed.toISOString(),
        expiresAt: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        msUntilExpiry:
          end && !Number.isNaN(end.getTime())
            ? Math.max(0, end.getTime() - now.getTime())
            : null,
        expired: false,
      };
    })
    .sort((a, b) => a.slotIndex - b.slotIndex);

  const offers: SponsorOfferView[] = so.sponsors.map((t) => {
    let lockedReason: SponsorOfferView["lockedReason"] = null;
    if (input.playerLevel < t.requiresPlayerLevel) lockedReason = "LEVEL";
    else if (input.fans < t.requiresFans) lockedReason = "FANS";
    else if (input.stadiumLevel < t.requiresStadiumLevel) {
      lockedReason = "STADIUM";
    } else if (input.clubFunds < t.signCost) lockedReason = "FUNDS";
    return {
      key: t.key,
      nameEn: t.nameEn,
      nameFa: t.nameFa,
      tier: t.tier,
      signCost: t.signCost,
      payoutPerTick: t.payoutPerTick,
      facilityRateBonusPercent: t.facilityRateBonusPercent,
      requiresFans: t.requiresFans,
      requiresStadiumLevel: t.requiresStadiumLevel,
      requiresPlayerLevel: t.requiresPlayerLevel,
      durationHours: t.durationHours,
      eligible: lockedReason === null || lockedReason === "FUNDS",
      canAfford: lockedReason === null,
      lockedReason,
    };
  });

  const nextPayoutEstimate = deals.reduce((s, d) => s + d.payoutPerTick, 0);
  const facilityRateMult = sponsorFacilityRateMult(input.deals, config, now);

  return {
    enabled: so.enabled,
    built,
    level: Math.max(0, input.officeLevel),
    maxLevel: so.maxLevel,
    unlockPlayerLevel: so.unlockPlayerLevel,
    buildCost: so.buildCost,
    upgradeCost: upCost,
    canBuild:
      so.enabled &&
      !built &&
      input.playerLevel >= so.unlockPlayerLevel &&
      input.clubFunds >= so.buildCost,
    canUpgrade:
      so.enabled &&
      built &&
      upCost !== null &&
      input.clubFunds >= upCost,
    slots,
    deals,
    offers,
    facilityRateMult,
    facilityBonusPercent: Math.round((facilityRateMult - 1) * 100),
    payoutIntervalHours: so.payoutIntervalHours,
    msUntilNextPayout:
      built && deals.length > 0
        ? msUntilNextSponsorPayout(
            input.lastPayoutAt,
            so.payoutIntervalHours,
            now,
          )
        : null,
    nextPayoutEstimate,
  };
}
