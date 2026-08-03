// Pure sponsored-bank interest math (ADR 003 — lazy settle, no mint cron).

import type { GameConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";

const MS_PER_HOUR = 3_600_000;

export type BankInterestSettle = {
  balance: number;
  lastAt: Date | null;
  gained: number;
  ticks: number;
};

/** Floor % of balance, capped per tick. */
export function interestForBalance(
  balance: number,
  interestPercent: number,
  maxInterestPerTick: number,
): number {
  if (balance <= 0 || interestPercent <= 0) return 0;
  const raw = Math.floor((balance * interestPercent) / 100);
  return Math.min(maxInterestPerTick, Math.max(0, raw));
}

export function msUntilNextInterest(
  lastAt: Date | string | null | undefined,
  intervalHours: number,
  now: Date = new Date(),
): number {
  if (!lastAt) return 0;
  const last = lastAt instanceof Date ? lastAt : new Date(lastAt);
  if (Number.isNaN(last.getTime())) return 0;
  const intervalMs = Math.max(1, intervalHours) * MS_PER_HOUR;
  const due = last.getTime() + intervalMs;
  return Math.max(0, due - now.getTime());
}

/**
 * Apply up to maxCatchupTicks of interest while sponsored.
 * Advances the clock even when balance < min (so deposits aren't stuck
 * behind a pile of unpaid intervals).
 */
export function settleSponsoredInterest(input: {
  balance: number;
  active: boolean;
  lastAt: Date | string | null | undefined;
  now?: Date;
  config?: GameConfig;
}): BankInterestSettle {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const sb = config.businessEconomy.sponsoredBank;
  const now = input.now ?? new Date();

  if (!input.active || !sb.enabled) {
    return {
      balance: input.balance,
      lastAt: input.lastAt
        ? input.lastAt instanceof Date
          ? input.lastAt
          : new Date(input.lastAt)
        : null,
      gained: 0,
      ticks: 0,
    };
  }

  const intervalMs = Math.max(1, sb.intervalHours) * MS_PER_HOUR;
  let last =
    input.lastAt == null
      ? now
      : input.lastAt instanceof Date
        ? input.lastAt
        : new Date(input.lastAt);
  if (Number.isNaN(last.getTime())) last = now;

  let bal = Math.max(0, Math.floor(input.balance));
  let gained = 0;
  let ticks = 0;

  while (
    ticks < sb.maxCatchupTicks &&
    now.getTime() - last.getTime() >= intervalMs
  ) {
    if (bal >= sb.minBalance) {
      const add = interestForBalance(
        bal,
        sb.interestPercent,
        sb.maxInterestPerTick,
      );
      bal += add;
      gained += add;
    }
    last = new Date(last.getTime() + intervalMs);
    ticks += 1;
  }

  return { balance: bal, lastAt: last, gained, ticks };
}

export type BankView = {
  balance: number;
  sponsoredActive: boolean;
  sponsoredAvailable: boolean;
  sponsorNameEn: string;
  sponsorNameFa: string;
  interestPercent: number;
  intervalHours: number;
  minBalance: number;
  upgradeCost: number;
  canAffordUpgrade: boolean;
  /** Ms until next interest tick; null if not sponsored. */
  msUntilNextInterest: number | null;
  /** Estimated next tick payout at current balance. */
  nextInterestEstimate: number;
  maxInterestPerTick: number;
};

export function buildBankView(input: {
  clubFunds: number;
  sponsoredActive: boolean;
  lastBankInterestAt?: Date | string | null;
  config?: GameConfig;
  now?: Date;
}): BankView {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const sb = config.businessEconomy.sponsoredBank;
  const now = input.now ?? new Date();
  const active = input.sponsoredActive && sb.enabled;

  return {
    balance: input.clubFunds,
    sponsoredActive: active,
    sponsoredAvailable: sb.enabled,
    sponsorNameEn: sb.nameEn,
    sponsorNameFa: sb.nameFa,
    interestPercent: sb.interestPercent,
    intervalHours: sb.intervalHours,
    minBalance: sb.minBalance,
    upgradeCost: sb.upgradeCost,
    canAffordUpgrade:
      sb.enabled &&
      !input.sponsoredActive &&
      input.clubFunds >= sb.upgradeCost,
    msUntilNextInterest: active
      ? msUntilNextInterest(
          input.lastBankInterestAt,
          sb.intervalHours,
          now,
        )
      : null,
    nextInterestEstimate: active
      ? interestForBalance(
          input.clubFunds,
          sb.interestPercent,
          sb.maxInterestPerTick,
        )
      : 0,
    maxInterestPerTick: sb.maxInterestPerTick,
  };
}
