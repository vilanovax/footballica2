// Central game-economy configuration & math. Pure and framework-free so the
// SAME numbers/formulas run on the server (authoritative) and the client
// (preview + UI), guaranteeing they never disagree. Tune balancing here.

import type { KickLog } from "@/lib/quiz/types";

// ─── Dynamic game config (Live-Ops tunable) ──────────────────────────────────
// The shape persisted (partially) in the DB `GameConfig` singleton. All match
// economy numbers flow through here so they can be retuned from the Admin CMS
// without a deploy. `mergeGameConfig` fills any missing/invalid key from the
// defaults below, so a partial or malformed DB row can never break the loop.

export type GameConfig = {
  rewards: {
    /** XP per correct answer (goal). */
    baseXp: number;
    /** Flat XP bonus for winning (goal majority). */
    winBonus: number;
    /** Max reward multiplier at a full-match combo (scales with streak length). */
    comboMultiplier: number;
    /** Coins granted for a win. */
    coinsPerWin: number;
    /** Extra coins for a flawless match (every kick scored). */
    perfectBonus: number;
    /** Fans grown per correct answer. */
    fansPerGoal: number;
    /** Extra fans for a win. */
    fansWinBonus: number;
    /** Coins granted per level gained on level-up (also refills stamina). */
    levelUpCoins: number;
  };
  costs: {
    /** Coins to instantly refill stamina to full. */
    staminaRefill: number;
    /** Coins for the 50/50 booster (removes two wrong options). */
    boosterFiftyFifty: number;
    /** Coins for the Freeze booster (pauses the fuse once). */
    boosterFreezeTimer: number;
  };
  match: {
    /** Kicks in a full penalty shootout. */
    questionCount: number;
    /** Kicks in the shorter FTUE tutorial match. */
    tutorialQuestionCount: number;
  };
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  rewards: {
    baseXp: 10,
    winBonus: 50,
    comboMultiplier: 1.5,
    coinsPerWin: 20,
    perfectBonus: 10,
    fansPerGoal: 5,
    fansWinBonus: 10,
    levelUpCoins: 100,
  },
  costs: {
    staminaRefill: 100,
    boosterFiftyFifty: 50,
    boosterFreezeTimer: 75,
  },
  match: {
    questionCount: 7,
    tutorialQuestionCount: 3,
  },
};

/** Finite-number guard with fallback (rejects NaN/Infinity/non-numbers). */
function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Merge a raw (partial/untrusted) config object over the defaults. Every field
 * is coerced + validated so the returned config is always complete and safe.
 */
export function mergeGameConfig(raw: unknown): GameConfig {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    Record<string, unknown> | undefined
  >;
  const r = src.rewards ?? {};
  const c = src.costs ?? {};
  const m = src.match ?? {};
  const D = DEFAULT_GAME_CONFIG;

  return {
    rewards: {
      baseXp: Math.max(0, num(r.baseXp, D.rewards.baseXp)),
      winBonus: Math.max(0, num(r.winBonus, D.rewards.winBonus)),
      comboMultiplier: Math.max(1, num(r.comboMultiplier, D.rewards.comboMultiplier)),
      coinsPerWin: Math.max(0, num(r.coinsPerWin, D.rewards.coinsPerWin)),
      perfectBonus: Math.max(0, num(r.perfectBonus, D.rewards.perfectBonus)),
      fansPerGoal: Math.max(0, num(r.fansPerGoal, D.rewards.fansPerGoal)),
      fansWinBonus: Math.max(0, num(r.fansWinBonus, D.rewards.fansWinBonus)),
      levelUpCoins: Math.max(0, num(r.levelUpCoins, D.rewards.levelUpCoins)),
    },
    costs: {
      staminaRefill: Math.max(0, num(c.staminaRefill, D.costs.staminaRefill)),
      boosterFiftyFifty: Math.max(0, num(c.boosterFiftyFifty, D.costs.boosterFiftyFifty)),
      boosterFreezeTimer: Math.max(0, num(c.boosterFreezeTimer, D.costs.boosterFreezeTimer)),
    },
    match: {
      questionCount: Math.max(1, Math.round(num(m.questionCount, D.match.questionCount))),
      tutorialQuestionCount: Math.max(
        1,
        Math.round(num(m.tutorialQuestionCount, D.match.tutorialQuestionCount)),
      ),
    },
  };
}

// ─── Leveling curve ──────────────────────────────────────────────────────────
// Gentle exponential: reaching level 2 costs 100 XP, level 10 ≈ 5000 XP.
// Tuned so cumulativeXpForLevel(L) = BASE * (L-1)^EXP.

const LEVEL_BASE_XP = 100;
const LEVEL_EXPONENT = 1.78;
/** Hard cap so the curve/loops stay bounded. */
export const MAX_LEVEL = 100;

/** Total lifetime XP required to *reach* a given level (level 1 = 0). */
export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(LEVEL_BASE_XP * Math.pow(level - 1, LEVEL_EXPONENT));
}

export type LevelInfo = {
  /** Current level (1-based). */
  level: number;
  /** XP accumulated *within* the current level. */
  currentLevelXp: number;
  /** XP span needed to complete the current level. */
  nextLevelXp: number;
  /** 0..1 progress toward the next level (1 at max level). */
  progress: number;
};

/**
 * Resolve a lifetime XP total into level + progress. Source of truth for the
 * player's level (the stored `managerLevel` is just a cache of this).
 */
export function calculateLevel(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp || 0));

  let level = 1;
  while (level < MAX_LEVEL && cumulativeXpForLevel(level + 1) <= xp) {
    level += 1;
  }

  const currentBase = cumulativeXpForLevel(level);
  const nextBase = cumulativeXpForLevel(level + 1);
  const span = Math.max(1, nextBase - currentBase);
  const currentLevelXp = xp - currentBase;

  return {
    level,
    currentLevelXp,
    nextLevelXp: span,
    progress: level >= MAX_LEVEL ? 1 : Math.min(1, currentLevelXp / span),
  };
}

// ─── Match reward computation ─────────────────────────────────────────────────

/** A match is won on a strict majority of goals; perfect = every kick scored. */
export function matchOutcome(
  goals: number,
  total: number,
): { won: boolean; perfect: boolean } {
  return {
    won: total > 0 && goals > total / 2,
    perfect: total > 0 && goals === total,
  };
}

/** Longest run of consecutive correct answers (the "combo"). */
export function longestGoalStreak(log: KickLog[]): number {
  let best = 0;
  let current = 0;
  for (const kick of log) {
    if (kick.result === "goal") {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/**
 * Effective combo multiplier — scales from 1 (no streak) up to the configured
 * `comboMultiplier` at a full-match streak, proportional to streak length. A
 * flawless run earns the full bonus; a lone correct answer earns none.
 */
export function comboMultiplierFor(
  bestCombo: number,
  total: number,
  maxMultiplier: number,
): number {
  if (bestCombo <= 1 || total <= 1) return 1;
  const t = Math.min(1, (bestCombo - 1) / (total - 1));
  return 1 + (maxMultiplier - 1) * t;
}

/** Detailed, itemized reward payload so the UI can explain & animate the math. */
export type RewardBreakdown = {
  /** Final totals applied to the economy. */
  coins: number;
  xp: number;
  fans: number;
  // Match shape
  goals: number;
  misses: number;
  total: number;
  won: boolean;
  perfect: boolean;
  /** Longest consecutive-correct streak. */
  combo: number;
  /** Multiplier actually applied to XP + coins from the combo. */
  comboFactor: number;
  /** Itemized lines (pre-booster) for the result screen. */
  breakdown: {
    xpFromGoals: number;
    xpWinBonus: number;
    coinsWin: number;
    coinsPerfectBonus: number;
    /** Extra XP contributed by the combo multiplier. */
    comboXpBonus: number;
    /** Extra coins contributed by the combo multiplier. */
    comboCoinBonus: number;
  };
};

/**
 * Authoritative reward math from a verified kick log, driven by the (dynamic)
 * game config. The server runs this on its own re-derived log with the DB
 * config; the client runs it with defaults for an instant preview.
 */
export function computeMatchRewards(
  log: KickLog[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): RewardBreakdown {
  const r = config.rewards;
  const total = log.length;
  const goals = log.reduce((n, k) => n + (k.result === "goal" ? 1 : 0), 0);
  const misses = total - goals;
  const { won, perfect } = matchOutcome(goals, total);

  const combo = longestGoalStreak(log);
  const comboFactor = comboMultiplierFor(combo, total, r.comboMultiplier);

  const xpFromGoals = goals * r.baseXp;
  const xpWinBonus = won ? r.winBonus : 0;
  const baseXp = xpFromGoals + xpWinBonus;
  const xp = Math.round(baseXp * comboFactor);

  const coinsWin = won ? r.coinsPerWin : 0;
  const coinsPerfectBonus = perfect ? r.perfectBonus : 0;
  const baseCoins = coinsWin + coinsPerfectBonus;
  const coins = Math.round(baseCoins * comboFactor);

  const fans = goals * r.fansPerGoal + (won ? r.fansWinBonus : 0);

  return {
    coins,
    xp,
    fans,
    goals,
    misses,
    total,
    won,
    perfect,
    combo,
    comboFactor,
    breakdown: {
      xpFromGoals,
      xpWinBonus,
      coinsWin,
      coinsPerfectBonus,
      comboXpBonus: xp - baseXp,
      comboCoinBonus: coins - baseCoins,
    },
  };
}
