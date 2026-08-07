import type { GameConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";

export type MuseumBadgeTier = "bronze" | "silver" | "gold";

/** One owned badge resolved for Museum trophy math. */
export type MuseumBadgeRef = {
  slug: string;
  tier: string;
  category: string;
  /** Challenge showcase badges without a catalog row. */
  fromChallenge?: boolean;
};

export type MuseumTrophyBreakdown = {
  badgeCount: number;
  byTier: { bronze: number; silver: number; gold: number };
  showcaseCount: number;
  /** How many categories hit the set-bonus threshold. */
  setBonusCount: number;
  /** Uncapped weighted % before global cap. */
  rawPercent: number;
  /** Applied bonus % after cap. */
  bonusPercent: number;
};

function normalizeTier(raw: string): MuseumBadgeTier {
  const t = raw.trim().toLowerCase();
  if (t === "gold" || t === "silver" || t === "bronze") return t;
  return "bronze";
}

function normalizeCategory(raw: string, fromChallenge?: boolean): string {
  if (fromChallenge) return "showcase";
  const c = raw.trim().toLowerCase();
  return c || "skill";
}

/** Weighted trophy % from owned badges (tier × base + category extras + sets). */
export function museumTrophyRawPercent(
  badges: MuseumBadgeRef[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const mt = config.businessEconomy.museumTrophy;
  const weights = mt.tierWeights;
  const catBonus = mt.categoryBonusPercent;
  let raw = 0;
  const byCategory = new Map<string, number>();

  for (const b of badges) {
    const tier = normalizeTier(b.tier);
    const category = normalizeCategory(b.category, b.fromChallenge);
    const weight =
      tier === "gold"
        ? weights.gold
        : tier === "silver"
          ? weights.silver
          : weights.bronze;
    const extra =
      typeof catBonus[category] === "number" ? catBonus[category]! : 0;
    raw += mt.percentPerBadge * weight + Math.max(0, extra);
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
  }

  const set = mt.categorySetBonus;
  if (set.threshold > 0 && set.bonusPercent > 0) {
    for (const count of byCategory.values()) {
      if (count >= set.threshold) raw += set.bonusPercent;
    }
  }

  return Math.max(0, raw);
}

export function museumTrophyBreakdown(
  badges: MuseumBadgeRef[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): MuseumTrophyBreakdown {
  const mt = config.businessEconomy.museumTrophy;
  const byTier = { bronze: 0, silver: 0, gold: 0 };
  let showcaseCount = 0;
  const byCategory = new Map<string, number>();

  for (const b of badges) {
    const tier = normalizeTier(b.tier);
    byTier[tier] += 1;
    const category = normalizeCategory(b.category, b.fromChallenge);
    if (category === "showcase") showcaseCount += 1;
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
  }

  let setBonusCount = 0;
  const set = mt.categorySetBonus;
  if (set.threshold > 0 && set.bonusPercent > 0) {
    for (const count of byCategory.values()) {
      if (count >= set.threshold) setBonusCount += 1;
    }
  }

  const rawPercent = museumTrophyRawPercent(badges, config);
  const bonusPercent = Math.min(mt.bonusCapPercent, rawPercent);

  return {
    badgeCount: badges.length,
    byTier,
    showcaseCount,
    setBonusCount,
    rawPercent,
    bonusPercent,
  };
}

/** Trophy rate factor (1.0 = no bonus). */
export function museumTrophyFactorFromBadges(
  badges: MuseumBadgeRef[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  return 1 + museumTrophyBreakdown(badges, config).bonusPercent / 100;
}

/** @deprecated Prefer museumTrophyFactorFromBadges — flat count fallback. */
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

/** @deprecated Prefer museumTrophyBreakdown. */
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
