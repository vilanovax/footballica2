// Central game-economy configuration & math. Pure and framework-free so the
// SAME numbers/formulas run on the server (authoritative) and the client
// (preview + UI), guaranteeing they never disagree. Tune balancing here.

import type { KickLog } from "@/lib/quiz/types";
import { normalizeThemeKey } from "@/lib/game/liveOpsTheme";

// ─── Dynamic game config (Live-Ops tunable) ──────────────────────────────────
// The shape persisted (partially) in the DB `GameConfig` singleton. All match
// economy numbers flow through here so they can be retuned from the Admin CMS
// without a deploy. `mergeGameConfig` fills any missing/invalid key from the
// defaults below, so a partial or malformed DB row can never break the loop.

export type LiveModeId =
  | "memory"
  | "mystery"
  | "grid"
  | "starPath"
  | "tikiTaka";

export type LiveModePlacement = {
  /** Offer as a one-shot special round in Draft Duel. */
  duel: boolean;
  /** Include in the Game of the Day rotator. */
  gotd: boolean;
};

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
  /**
   * In-match coin-spend helpers (paid live during a quiz, once per question).
   * Costs are re-validated & deducted server-side in resolveMatch.
   */
  helpers: {
    /** Pundit hint — removes ONE wrong option. */
    hint: number;
    /** Injury Time — adds seconds to the current question's fuse. */
    extraTime: number;
    /** VAR 50/50 — removes TWO wrong options. */
    fifty: number;
    /** Substitution — swaps the current question for a fresh one. */
    reroll: number;
    /** Milliseconds added to the fuse by one Injury Time. */
    extraTimeMs: number;
  };
  match: {
    /** Kicks in a full penalty shootout. */
    questionCount: number;
    /** Kicks in the shorter FTUE tutorial match. */
    tutorialQuestionCount: number;
    /** Questions in a rapid-fire Quick Match (PRD §4C: 5–10). */
    quickQuestionCount: number;
  };
  /** Async Draft Duel (2 light rounds). Tunable from Admin Live-Ops. */
  duel: {
    /** Questions the attacker answers after picking a category. */
    questionsPerAttack: number;
    /** Full rounds (each player attacks once). Locked to 2 for v1. */
    rounds: number;
    /** Categories offered in the draft picker. */
    draftChoices: number;
    /** Hours the opponent has to take their turn before timeout handling. */
    turnHours: number;
    /**
     * When a human turn deadline expires:
     * - AUTO_FORFEIT — AFK loses immediately; active player wins.
     * - SHADOW_BOT — fabricate AFK answers; active player finishes the match.
     */
    timeoutAction: "AUTO_FORFEIT" | "SHADOW_BOT";
    /** Simulated bot delay window (ms). */
    botDelayMinMs: number;
    botDelayMaxMs: number;
    /**
     * How long a challenger waits for a human before a bot is assigned (ms).
     * Keep short so Match Day never feels stuck on an empty queue.
     */
    matchmakingMs: number;
    /** Weekly leaderboard XP granted to the duel winner. */
    winWeeklyXp: number;
    /** Stamina spent when opening a duel. */
    staminaCost: number;
    /** MEMORY round: number of pairs on the shared board (v1: 8 → 4×4). */
    memoryPairs: number;
    /** MEMORY half clock (ms) — server-authoritative from attack/defense start. */
    memoryTurnMs: number;
    /** Client flip-reveal duration hint (ms); server may ignore. */
    memoryRevealMs: number;
    /** Tiki-Taka mini-turn clock (ms) — server-authoritative. */
    tikiTakaTurnMs: number;
  };
  /**
   * Survival Mode soft economy — Live-Ops tunable (weekend 2× coins, etc.).
   * Pure math in `lib/game/survival.ts` reads these; settle fetches config.
   */
  survival: {
    coinsPerCorrect: number;
    xpPerCorrect: number;
    fansPerCorrect: number;
    clearedCoinBonus: number;
    clearedXpBonus: number;
    /**
     * Weekly XP = max(1, floor(score / weeklyXpDivisor)).
     * Must be ≥ 1 (merge clamps).
     */
    weeklyXpDivisor: number;
    staminaCost: number;
    lives: number;
  };
  /**
   * Global theme week for classic Penalty / Quick / Survival draws (Phase C).
   * RecordChallenge can override per-event via its own theme fields.
   * `themeKey: null` disables the global theme.
   */
  liveOps: {
    themeKey: string | null;
    titleEn: string;
    titleFa: string;
    blurbEn: string;
    blurbFa: string;
    /** Empty = use theme preset types (or all formats if no key). */
    preferredTypes: string[];
    formatBiasEveryN: number;
  };
  /**
   * Game of the Day (Mystery / Grid / Star Path / Memory rotation).
   * Direct Club.coins + User.xp grants — no global wallet ledger.
   */
  gotd: {
    mysteryWinCoins: number;
    mysteryWinXp: number;
    gridWinCoins: number;
    gridWinXp: number;
    /** Star Path max payout (score 100 — first clue). */
    starPathWinCoinsMax: number;
    starPathWinXpMax: number;
    /** Star Path min payout (score 25 — fourth clue). */
    starPathWinCoinsMin: number;
    starPathWinXpMin: number;
    /** Memory GotD win payout. */
    memoryWinCoins: number;
    memoryWinXp: number;
    /** Extra coin fraction per streak day, e.g. 0.1 → +10% of base per day. */
    streakMultiplierPerDay: number;
    /** Flat coin bonus for perfect clear (Mystery 1-guess / Grid 0 mistakes / Star Path 100). */
    perfectClearBonusCoins: number;
  };
  /**
   * Live-Ops mode placement — admin toggles Duel draft tiles vs GotD rotator.
   * Engines always exist; surfaces honor these flags.
   */
  liveModes: {
    memory: LiveModePlacement;
    mystery: LiveModePlacement;
    grid: LiveModePlacement;
    starPath: LiveModePlacement;
    tikiTaka: LiveModePlacement;
  };
  /**
   * Club business layer (ADR 003) — Club Funds idle economy.
   * Never pays into `Club.coins`.
   */
  businessEconomy: {
    /** Spendable Funds granted once when business layer unlocks (FTUE / bootstrap). */
    seedFunds: number;
    vault: {
      maxLevel: number;
      baseCost: number;
      costGrowth: number;
      /** Hours of aggregate rate at vault levels 1..N. */
      capHours: number[];
    };
    /** Club Shop: rate *= 1 + min(cap, fans / divisor). */
    shopFansDivisor: number;
    shopFansBonusCap: number;
    /**
     * First non-tutorial win of a Tehran day → temporary facility income boost.
     * `boostBonus` is added to 1.0 (0.2 → +20%).
     */
    firstWinBoostBonus: number;
    firstWinBoostMs: number;
    /**
     * Optional sponsored bank — % interest on spendable Club Funds (lazy settle).
     * Never credits match coins.
     */
    sponsoredBank: {
      /** Master switch from Live-Ops. */
      enabled: boolean;
      nameEn: string;
      nameFa: string;
      /** Percent per tick, e.g. 1 = 1%. */
      interestPercent: number;
      /** Hours between interest ticks. */
      intervalHours: number;
      /** Balance must be ≥ this for a non-zero floor(interest). */
      minBalance: number;
      /** Cap interest granted in a single tick. */
      maxInterestPerTick: number;
      /** Max missed ticks applied on one settle. */
      maxCatchupTicks: number;
      /** Spendable Funds cost to activate sponsored bank. */
      upgradeCost: number;
    };
    facilities: {
      TICKET_OFFICE: BusinessFacilityConfig;
      CLUB_SHOP: BusinessFacilityConfig;
      MUSEUM: BusinessFacilityConfig;
    };
  };
};

export type BusinessFacilityConfig = {
  unlockPlayerLevel: number;
  baseBuildCost: number;
  baseRatePerHour: number;
  baseStorageHours: number;
  costGrowth: number;
  rateGrowth: number;
  capGrowth: number;
  maxLevel: number;
  usesFansFactor: boolean;
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
  helpers: {
    hint: 20,
    extraTime: 20,
    fifty: 40,
    reroll: 50,
    extraTimeMs: 5000,
  },
  match: {
    questionCount: 7,
    tutorialQuestionCount: 3,
    quickQuestionCount: 10,
  },
  duel: {
    questionsPerAttack: 5,
    rounds: 2,
    draftChoices: 3,
    turnHours: 24,
    timeoutAction: "SHADOW_BOT",
    botDelayMinMs: 2 * 60 * 1000,
    botDelayMaxMs: 10 * 60 * 1000,
    /** Visual search window before bot fallback (min 5s enforced in merge). */
    matchmakingMs: 15_000,
    winWeeklyXp: 3,
    staminaCost: 1,
    memoryPairs: 8,
    memoryTurnMs: 20_000,
    memoryRevealMs: 2_000,
    tikiTakaTurnMs: 20_000,
  },
  survival: {
    coinsPerCorrect: 5,
    xpPerCorrect: 10,
    fansPerCorrect: 2,
    clearedCoinBonus: 25,
    clearedXpBonus: 50,
    weeklyXpDivisor: 3,
    staminaCost: 1,
    lives: 3,
  },
  liveOps: {
    themeKey: null,
    titleEn: "",
    titleFa: "",
    blurbEn: "",
    blurbFa: "",
    preferredTypes: [],
    formatBiasEveryN: 1,
  },
  gotd: {
    mysteryWinCoins: 40,
    mysteryWinXp: 30,
    gridWinCoins: 50,
    gridWinXp: 35,
    starPathWinCoinsMax: 45,
    starPathWinXpMax: 35,
    starPathWinCoinsMin: 15,
    starPathWinXpMin: 12,
    memoryWinCoins: 35,
    memoryWinXp: 25,
    streakMultiplierPerDay: 0.1,
    perfectClearBonusCoins: 25,
  },
  liveModes: {
    memory: { duel: true, gotd: false },
    mystery: { duel: false, gotd: true },
    grid: { duel: false, gotd: true },
    starPath: { duel: false, gotd: true },
    tikiTaka: { duel: true, gotd: false },
  },
  businessEconomy: {
    seedFunds: 150,
    vault: {
      maxLevel: 5,
      baseCost: 500,
      costGrowth: 2,
      capHours: [3, 6, 8, 12, 24],
    },
    shopFansDivisor: 2000,
    shopFansBonusCap: 0.5,
    firstWinBoostBonus: 0.2,
    firstWinBoostMs: 60 * 60 * 1000,
    sponsoredBank: {
      enabled: true,
      nameEn: "Saman Bank",
      nameFa: "بانک سامان",
      interestPercent: 1,
      intervalHours: 4,
      minBalance: 100,
      maxInterestPerTick: 50,
      maxCatchupTicks: 3,
      upgradeCost: 200,
    },
    facilities: {
      TICKET_OFFICE: {
        unlockPlayerLevel: 1,
        baseBuildCost: 0,
        baseRatePerHour: 40,
        baseStorageHours: 2,
        costGrowth: 2,
        rateGrowth: 1.5,
        capGrowth: 1.15,
        maxLevel: 5,
        usesFansFactor: false,
      },
      CLUB_SHOP: {
        unlockPlayerLevel: 3,
        baseBuildCost: 500,
        baseRatePerHour: 80,
        baseStorageHours: 3,
        costGrowth: 1.75,
        rateGrowth: 1.5,
        capGrowth: 1.1,
        maxLevel: 5,
        usesFansFactor: true,
      },
      MUSEUM: {
        unlockPlayerLevel: 5,
        baseBuildCost: 2500,
        baseRatePerHour: 100,
        baseStorageHours: 4,
        costGrowth: 1.55,
        rateGrowth: 1.5,
        capGrowth: 1.08,
        maxLevel: 5,
        usesFansFactor: false,
      },
    },
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
  const h = src.helpers ?? {};
  const m = src.match ?? {};
  const d = src.duel ?? {};
  const s = src.survival ?? {};
  const lo = (src.liveOps ?? {}) as Record<string, unknown>;
  const g = src.gotd ?? {};
  const lm = (src.liveModes ?? {}) as Record<string, unknown>;
  const be = (src.businessEconomy ?? {}) as Record<string, unknown>;
  const beVault = (be.vault ?? {}) as Record<string, unknown>;
  const beFac = (be.facilities ?? {}) as Record<string, unknown>;
  const beBank = (be.sponsoredBank ?? {}) as Record<string, unknown>;
  const DBank = DEFAULT_GAME_CONFIG.businessEconomy.sponsoredBank;
  const D = DEFAULT_GAME_CONFIG;

  const mergeFacility = (
    raw: unknown,
    fallback: BusinessFacilityConfig,
  ): BusinessFacilityConfig => {
    const o =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      unlockPlayerLevel: Math.max(
        1,
        Math.round(num(o.unlockPlayerLevel, fallback.unlockPlayerLevel)),
      ),
      baseBuildCost: Math.max(
        0,
        Math.round(num(o.baseBuildCost, fallback.baseBuildCost)),
      ),
      baseRatePerHour: Math.max(
        0,
        Math.round(num(o.baseRatePerHour, fallback.baseRatePerHour)),
      ),
      baseStorageHours: Math.max(
        0.5,
        num(o.baseStorageHours, fallback.baseStorageHours),
      ),
      costGrowth: Math.max(1, num(o.costGrowth, fallback.costGrowth)),
      rateGrowth: Math.max(1, num(o.rateGrowth, fallback.rateGrowth)),
      capGrowth: Math.max(1, num(o.capGrowth, fallback.capGrowth)),
      maxLevel: Math.max(
        1,
        Math.min(20, Math.round(num(o.maxLevel, fallback.maxLevel))),
      ),
      usesFansFactor:
        typeof o.usesFansFactor === "boolean"
          ? o.usesFansFactor
          : fallback.usesFansFactor,
    };
  };

  const mergePlacement = (
    raw: unknown,
    fallback: LiveModePlacement,
  ): LiveModePlacement => {
    const o =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return {
      duel: typeof o.duel === "boolean" ? o.duel : fallback.duel,
      gotd: typeof o.gotd === "boolean" ? o.gotd : fallback.gotd,
    };
  };

  // Normalize LOGO_WEEK / logo / aliases → short key (or null = NONE).
  const themeKey = normalizeThemeKey(lo.themeKey);

  const preferredTypes = Array.isArray(lo.preferredTypes)
    ? lo.preferredTypes.filter((t): t is string => typeof t === "string")
    : [...D.liveOps.preferredTypes];

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
    helpers: {
      hint: Math.max(0, Math.round(num(h.hint, D.helpers.hint))),
      extraTime: Math.max(0, Math.round(num(h.extraTime, D.helpers.extraTime))),
      fifty: Math.max(0, Math.round(num(h.fifty, D.helpers.fifty))),
      reroll: Math.max(0, Math.round(num(h.reroll, D.helpers.reroll))),
      extraTimeMs: Math.max(1000, Math.round(num(h.extraTimeMs, D.helpers.extraTimeMs))),
    },
    match: {
      questionCount: Math.max(1, Math.round(num(m.questionCount, D.match.questionCount))),
      tutorialQuestionCount: Math.max(
        1,
        Math.round(num(m.tutorialQuestionCount, D.match.tutorialQuestionCount)),
      ),
      quickQuestionCount: Math.max(
        1,
        Math.round(num(m.quickQuestionCount, D.match.quickQuestionCount)),
      ),
    },
    duel: {
      questionsPerAttack: Math.max(
        1,
        Math.round(num(d.questionsPerAttack, D.duel.questionsPerAttack)),
      ),
      // v1 product lock: always 2 light rounds (ignore Live-Ops drift above 2).
      rounds: 2,
      draftChoices: Math.max(
        2,
        Math.round(num(d.draftChoices, D.duel.draftChoices)),
      ),
      turnHours: Math.max(1, Math.round(num(d.turnHours, D.duel.turnHours))),
      timeoutAction:
        d.timeoutAction === "AUTO_FORFEIT" || d.timeoutAction === "SHADOW_BOT"
          ? d.timeoutAction
          : D.duel.timeoutAction,
      botDelayMinMs: Math.max(
        0,
        Math.round(num(d.botDelayMinMs, D.duel.botDelayMinMs)),
      ),
      botDelayMaxMs: Math.max(
        0,
        Math.round(num(d.botDelayMaxMs, D.duel.botDelayMaxMs)),
      ),
      matchmakingMs: Math.max(
        5_000,
        Math.round(num(d.matchmakingMs, D.duel.matchmakingMs)),
      ),
      winWeeklyXp: Math.max(0, Math.round(num(d.winWeeklyXp, D.duel.winWeeklyXp))),
      staminaCost: Math.max(0, Math.round(num(d.staminaCost, D.duel.staminaCost))),
      memoryPairs: Math.max(
        2,
        Math.min(8, Math.round(num(d.memoryPairs, D.duel.memoryPairs))),
      ),
      memoryTurnMs: Math.max(
        5_000,
        Math.min(60_000, Math.round(num(d.memoryTurnMs, D.duel.memoryTurnMs))),
      ),
      memoryRevealMs: Math.max(
        500,
        Math.min(5_000, Math.round(num(d.memoryRevealMs, D.duel.memoryRevealMs))),
      ),
      tikiTakaTurnMs: Math.max(
        5_000,
        Math.min(60_000, Math.round(num(d.tikiTakaTurnMs, D.duel.tikiTakaTurnMs))),
      ),
    },
    survival: {
      coinsPerCorrect: Math.max(
        0,
        Math.round(num(s.coinsPerCorrect, D.survival.coinsPerCorrect)),
      ),
      xpPerCorrect: Math.max(
        0,
        Math.round(num(s.xpPerCorrect, D.survival.xpPerCorrect)),
      ),
      fansPerCorrect: Math.max(
        0,
        Math.round(num(s.fansPerCorrect, D.survival.fansPerCorrect)),
      ),
      clearedCoinBonus: Math.max(
        0,
        Math.round(num(s.clearedCoinBonus, D.survival.clearedCoinBonus)),
      ),
      clearedXpBonus: Math.max(
        0,
        Math.round(num(s.clearedXpBonus, D.survival.clearedXpBonus)),
      ),
      weeklyXpDivisor: Math.max(
        1,
        Math.round(num(s.weeklyXpDivisor, D.survival.weeklyXpDivisor)),
      ),
      staminaCost: Math.max(
        0,
        Math.round(num(s.staminaCost, D.survival.staminaCost)),
      ),
      lives: Math.max(1, Math.round(num(s.lives, D.survival.lives))),
    },
    liveOps: {
      themeKey,
      titleEn:
        typeof lo.titleEn === "string" ? lo.titleEn : D.liveOps.titleEn,
      titleFa:
        typeof lo.titleFa === "string" ? lo.titleFa : D.liveOps.titleFa,
      blurbEn:
        typeof lo.blurbEn === "string" ? lo.blurbEn : D.liveOps.blurbEn,
      blurbFa:
        typeof lo.blurbFa === "string" ? lo.blurbFa : D.liveOps.blurbFa,
      preferredTypes,
      formatBiasEveryN: Math.min(
        20,
        Math.max(
          1,
          Math.round(num(lo.formatBiasEveryN, D.liveOps.formatBiasEveryN)),
        ),
      ),
    },
    gotd: {
      mysteryWinCoins: Math.max(
        0,
        Math.round(num(g.mysteryWinCoins, D.gotd.mysteryWinCoins)),
      ),
      mysteryWinXp: Math.max(
        0,
        Math.round(num(g.mysteryWinXp, D.gotd.mysteryWinXp)),
      ),
      gridWinCoins: Math.max(
        0,
        Math.round(num(g.gridWinCoins, D.gotd.gridWinCoins)),
      ),
      gridWinXp: Math.max(0, Math.round(num(g.gridWinXp, D.gotd.gridWinXp))),
      starPathWinCoinsMax: Math.max(
        0,
        Math.round(num(g.starPathWinCoinsMax, D.gotd.starPathWinCoinsMax)),
      ),
      starPathWinXpMax: Math.max(
        0,
        Math.round(num(g.starPathWinXpMax, D.gotd.starPathWinXpMax)),
      ),
      starPathWinCoinsMin: Math.max(
        0,
        Math.round(num(g.starPathWinCoinsMin, D.gotd.starPathWinCoinsMin)),
      ),
      starPathWinXpMin: Math.max(
        0,
        Math.round(num(g.starPathWinXpMin, D.gotd.starPathWinXpMin)),
      ),
      memoryWinCoins: Math.max(
        0,
        Math.round(num(g.memoryWinCoins, D.gotd.memoryWinCoins)),
      ),
      memoryWinXp: Math.max(
        0,
        Math.round(num(g.memoryWinXp, D.gotd.memoryWinXp)),
      ),
      streakMultiplierPerDay: Math.min(
        1,
        Math.max(
          0,
          num(g.streakMultiplierPerDay, D.gotd.streakMultiplierPerDay),
        ),
      ),
      perfectClearBonusCoins: Math.max(
        0,
        Math.round(
          num(g.perfectClearBonusCoins, D.gotd.perfectClearBonusCoins),
        ),
      ),
    },
    liveModes: {
      memory: mergePlacement(lm.memory, D.liveModes.memory),
      mystery: mergePlacement(lm.mystery, D.liveModes.mystery),
      grid: mergePlacement(lm.grid, D.liveModes.grid),
      starPath: mergePlacement(lm.starPath, D.liveModes.starPath),
      tikiTaka: mergePlacement(lm.tikiTaka, D.liveModes.tikiTaka),
    },
    businessEconomy: {
      seedFunds: Math.max(
        0,
        Math.round(num(be.seedFunds, D.businessEconomy.seedFunds)),
      ),
      vault: {
        maxLevel: Math.max(
          1,
          Math.min(
            20,
            Math.round(num(beVault.maxLevel, D.businessEconomy.vault.maxLevel)),
          ),
        ),
        baseCost: Math.max(
          1,
          Math.round(num(beVault.baseCost, D.businessEconomy.vault.baseCost)),
        ),
        costGrowth: Math.max(
          1,
          num(beVault.costGrowth, D.businessEconomy.vault.costGrowth),
        ),
        capHours: Array.isArray(beVault.capHours)
          ? (beVault.capHours as unknown[])
              .map((h, i) =>
                Math.max(
                  1,
                  num(h, D.businessEconomy.vault.capHours[i] ?? 3),
                ),
              )
              .slice(0, 10)
          : [...D.businessEconomy.vault.capHours],
      },
      shopFansDivisor: Math.max(
        1,
        Math.round(
          num(be.shopFansDivisor, D.businessEconomy.shopFansDivisor),
        ),
      ),
      shopFansBonusCap: Math.min(
        2,
        Math.max(
          0,
          num(be.shopFansBonusCap, D.businessEconomy.shopFansBonusCap),
        ),
      ),
      firstWinBoostBonus: Math.min(
        1,
        Math.max(
          0,
          num(be.firstWinBoostBonus, D.businessEconomy.firstWinBoostBonus),
        ),
      ),
      firstWinBoostMs: Math.max(
        60_000,
        Math.min(
          24 * 60 * 60 * 1000,
          Math.round(
            num(be.firstWinBoostMs, D.businessEconomy.firstWinBoostMs),
          ),
        ),
      ),
      sponsoredBank: {
        enabled:
          typeof beBank.enabled === "boolean"
            ? beBank.enabled
            : DBank.enabled,
        nameEn:
          typeof beBank.nameEn === "string" && beBank.nameEn.trim()
            ? beBank.nameEn.trim().slice(0, 48)
            : DBank.nameEn,
        nameFa:
          typeof beBank.nameFa === "string" && beBank.nameFa.trim()
            ? beBank.nameFa.trim().slice(0, 48)
            : DBank.nameFa,
        interestPercent: Math.min(
          20,
          Math.max(0, num(beBank.interestPercent, DBank.interestPercent)),
        ),
        intervalHours: Math.min(
          48,
          Math.max(
            1,
            Math.round(num(beBank.intervalHours, DBank.intervalHours)),
          ),
        ),
        minBalance: Math.max(
          0,
          Math.round(num(beBank.minBalance, DBank.minBalance)),
        ),
        maxInterestPerTick: Math.max(
          0,
          Math.round(
            num(beBank.maxInterestPerTick, DBank.maxInterestPerTick),
          ),
        ),
        maxCatchupTicks: Math.min(
          12,
          Math.max(
            1,
            Math.round(num(beBank.maxCatchupTicks, DBank.maxCatchupTicks)),
          ),
        ),
        upgradeCost: Math.max(
          0,
          Math.round(num(beBank.upgradeCost, DBank.upgradeCost)),
        ),
      },
      facilities: {
        TICKET_OFFICE: mergeFacility(
          beFac.TICKET_OFFICE,
          D.businessEconomy.facilities.TICKET_OFFICE,
        ),
        CLUB_SHOP: mergeFacility(
          beFac.CLUB_SHOP,
          D.businessEconomy.facilities.CLUB_SHOP,
        ),
        MUSEUM: mergeFacility(
          beFac.MUSEUM,
          D.businessEconomy.facilities.MUSEUM,
        ),
      },
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
