/**
 * Server-authoritative coin pack catalog (mock IAP).
 * Clients may display these values but MUST never send coins/price — only `packTier`.
 */

export type CoinPackTier = "SMALL" | "MEDIUM" | "LARGE";

export type CoinPackDef = {
  tier: CoinPackTier;
  coinsGranted: number;
  /** Mock fiat price (display / ledger). */
  price: number;
  currency: "IRR";
  /** Visual weight for shop cards. */
  highlight?: boolean;
};

export const COIN_PACKS: Record<CoinPackTier, CoinPackDef> = {
  SMALL: {
    tier: "SMALL",
    coinsGranted: 500,
    price: 49_000,
    currency: "IRR",
  },
  MEDIUM: {
    tier: "MEDIUM",
    coinsGranted: 1_200,
    price: 99_000,
    currency: "IRR",
    highlight: true,
  },
  LARGE: {
    tier: "LARGE",
    coinsGranted: 3_000,
    price: 199_000,
    currency: "IRR",
  },
};

export const COIN_PACK_LIST: CoinPackDef[] = [
  COIN_PACKS.SMALL,
  COIN_PACKS.MEDIUM,
  COIN_PACKS.LARGE,
];

export function isCoinPackTier(value: string): value is CoinPackTier {
  return value in COIN_PACKS;
}
