// Achievement / badge catalog + evaluation. Pure and framework-free so the
// SAME definitions run on the server (unlock at match end) and the client
// (locked/unlocked + progress rendering on the profile). The catalog is the
// source of truth for slugs, copy, icons, rewards, and unlock rules; the DB
// only stores which slugs a club has unlocked (see model ClubBadge).

export type BadgeCategory = "skill" | "purity" | "dedication" | "volume";
export type BadgeTier = "bronze" | "silver" | "gold";

/** Shape of the just-finished match (from the verified reward breakdown). */
export type MatchStats = {
  /** Longest consecutive-correct streak this match. */
  combo: number;
  /** Correct answers ("goals") this match. */
  goals: number;
  /** Kicks in the match. */
  total: number;
  /** Won on a goal majority. */
  won: boolean;
  /** Every kick scored. */
  perfect: boolean;
  /** Any help used (50/50, freeze, superpower). */
  usedHelp: boolean;
  /** FTUE tutorial run — excluded from "quality" badges so they stay meaningful. */
  isTutorial: boolean;
};

/** Lifetime player stats AFTER this match has been applied. */
export type PlayerStats = {
  matchesPlayed: number;
  matchesWon: number;
  goalsTotal: number;
  highestCombo: number;
  dailyStreak: number;
  longestDailyStreak: number;
  /** Mysterious Player — consecutive solved Tehran days. */
  mysteryStreak: number;
  longestMysteryStreak: number;
  /** Lifetime days solved (Mysterious Player). */
  mysterySolves: number;
};

export type AchievementContext = {
  match: MatchStats;
  player: PlayerStats;
};

export type Achievement = {
  slug: string;
  category: BadgeCategory;
  tier: BadgeTier;
  emoji: string;
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  /** Small payout granted once, at unlock. */
  reward: { coins: number; xp: number };
  /** Avatar slug this badge unlocks (wired in the profile phase). */
  unlocksAvatar?: string;
  /** True when the just-finished match + updated player stats earn this badge. */
  check: (ctx: AchievementContext) => boolean;
  /**
   * Lifetime progress toward the badge, for the locked state on the profile.
   * Omitted for badges whose progress isn't meaningfully countable.
   */
  progress?: (player: PlayerStats) => { current: number; target: number };
};

/** Clamp helper so a progress bar never shows current > target. */
function toward(value: number, target: number) {
  return { current: Math.min(Math.max(0, value), target), target };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Skill (per-match performance) ──────────────────────────────────────────
  {
    slug: "hat_trick",
    category: "skill",
    tier: "bronze",
    emoji: "🎩",
    nameEn: "Hat-trick",
    nameFa: "هتریک",
    descriptionEn: "Answer 3 questions correctly in a row.",
    descriptionFa: "۳ سؤال را پشت سر هم درست جواب بده.",
    reward: { coins: 20, xp: 0 },
    check: ({ match }) => match.combo >= 3,
    progress: (p) => toward(p.highestCombo, 3),
  },
  {
    slug: "on_fire",
    category: "skill",
    tier: "silver",
    emoji: "🌟",
    nameEn: "On Fire",
    nameFa: "گُل‌آتیش",
    descriptionEn: "String together 5 correct answers in a row.",
    descriptionFa: "۵ جواب درست پیاپی بزن.",
    reward: { coins: 40, xp: 15 },
    check: ({ match }) => match.combo >= 5,
    progress: (p) => toward(p.highestCombo, 5),
  },
  {
    slug: "clean_sheet",
    category: "skill",
    tier: "gold",
    emoji: "🧤",
    nameEn: "Clean Sheet",
    nameFa: "کلین‌شیت",
    descriptionEn: "Finish a match without missing a single kick.",
    descriptionFa: "یک مسابقه را بدون هیچ خطایی تمام کن.",
    reward: { coins: 50, xp: 0 },
    unlocksAvatar: "GOALKEEPER_LEGEND",
    check: ({ match }) => !match.isTutorial && match.perfect && match.total >= 3,
  },

  // ── Purity (no help) ────────────────────────────────────────────────────────
  {
    slug: "purist",
    category: "purity",
    tier: "silver",
    emoji: "🧠",
    nameEn: "Pure Skill",
    nameFa: "استاد خالص",
    descriptionEn: "Win a match without using any help or power-up.",
    descriptionFa: "یک مسابقه را بدون هیچ کمک یا سوپرپاور ببر.",
    reward: { coins: 30, xp: 0 },
    check: ({ match }) => !match.isTutorial && match.won && !match.usedHelp,
  },

  // ── Dedication (daily streak) ────────────────────────────────────────────────
  {
    slug: "streak_3",
    category: "dedication",
    tier: "bronze",
    emoji: "🔥",
    nameEn: "Warming Up",
    nameFa: "گرم‌شدن",
    descriptionEn: "Play 3 days in a row.",
    descriptionFa: "۳ روز پشت سر هم بازی کن.",
    reward: { coins: 30, xp: 0 },
    check: ({ player }) => player.dailyStreak >= 3,
    progress: (p) => toward(p.longestDailyStreak, 3),
  },
  {
    slug: "streak_7",
    category: "dedication",
    tier: "silver",
    emoji: "📅",
    nameEn: "Week Streak",
    nameFa: "هفتهٔ کامل",
    descriptionEn: "Keep a 7-day play streak alive.",
    descriptionFa: "استریک ۷ روزه را حفظ کن.",
    reward: { coins: 75, xp: 0 },
    unlocksAvatar: "SUPER_FAN",
    check: ({ player }) => player.dailyStreak >= 7,
    progress: (p) => toward(p.longestDailyStreak, 7),
  },
  {
    slug: "streak_30",
    category: "dedication",
    tier: "gold",
    emoji: "🏅",
    nameEn: "Unstoppable",
    nameFa: "توقف‌ناپذیر",
    descriptionEn: "Reach a 30-day play streak.",
    descriptionFa: "به استریک ۳۰ روزه برس.",
    reward: { coins: 300, xp: 0 },
    unlocksAvatar: "CLUB_LEGEND",
    check: ({ player }) => player.dailyStreak >= 30,
    progress: (p) => toward(p.longestDailyStreak, 30),
  },

  // ── Dedication (Mysterious Player daily) ────────────────────────────────────
  {
    slug: "mystery_debut",
    category: "dedication",
    tier: "bronze",
    emoji: "🕵️",
    nameEn: "First Suspect",
    nameFa: "اولین مظنون",
    descriptionEn: "Solve your first Mysterious Player of the day.",
    descriptionFa: "اولین بازیکن مرموز روز را پیدا کن.",
    reward: { coins: 25, xp: 10 },
    check: ({ player }) => player.mysterySolves >= 1,
    progress: (p) => toward(p.mysterySolves, 1),
  },
  {
    slug: "mystery_streak_3",
    category: "dedication",
    tier: "silver",
    emoji: "🔎",
    nameEn: "Hot on the Trail",
    nameFa: "ردپا داغ",
    descriptionEn: "Solve Mysterious Player 3 days in a row.",
    descriptionFa: "۳ روز پشت سر هم بازیکن مرموز را حل کن.",
    reward: { coins: 60, xp: 20 },
    check: ({ player }) => player.mysteryStreak >= 3,
    progress: (p) => toward(p.longestMysteryStreak, 3),
  },
  {
    slug: "mystery_streak_7",
    category: "dedication",
    tier: "gold",
    emoji: "🕶️",
    nameEn: "Master Detective",
    nameFa: "کارآگاه ارشد",
    descriptionEn: "Keep a 7-day Mysterious Player streak.",
    descriptionFa: "استریک ۷ روزهٔ بازیکن مرموز را حفظ کن.",
    reward: { coins: 150, xp: 50 },
    check: ({ player }) => player.mysteryStreak >= 7,
    progress: (p) => toward(p.longestMysteryStreak, 7),
  },

  // ── Volume (lifetime milestones) ─────────────────────────────────────────────
  {
    slug: "first_win",
    category: "volume",
    tier: "bronze",
    emoji: "⚽",
    nameEn: "First Victory",
    nameFa: "اولین برد",
    descriptionEn: "Win your very first match.",
    descriptionFa: "اولین مسابقه‌ات را ببر.",
    reward: { coins: 10, xp: 0 },
    check: ({ player }) => player.matchesWon >= 1,
    progress: (p) => toward(p.matchesWon, 1),
  },
  {
    slug: "veteran",
    category: "volume",
    tier: "silver",
    emoji: "🎖️",
    nameEn: "Veteran",
    nameFa: "کهنه‌کار",
    descriptionEn: "Play 50 matches.",
    descriptionFa: "۵۰ مسابقه بازی کن.",
    reward: { coins: 100, xp: 50 },
    unlocksAvatar: "OLD_GAFFER",
    check: ({ player }) => player.matchesPlayed >= 50,
    progress: (p) => toward(p.matchesPlayed, 50),
  },
  {
    slug: "centurion",
    category: "volume",
    tier: "gold",
    emoji: "💯",
    nameEn: "Centurion",
    nameFa: "صدتایی",
    descriptionEn: "Score 100 goals in total.",
    descriptionFa: "در مجموع ۱۰۰ گل بزن.",
    reward: { coins: 100, xp: 0 },
    check: ({ player }) => player.goalsTotal >= 100,
    progress: (p) => toward(p.goalsTotal, 100),
  },
];

/** Fast slug → Achievement lookup. */
export const ACHIEVEMENTS_BY_SLUG: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.slug, a]));

/**
 * Return the achievements newly earned by this match — i.e. their unlock rule
 * is satisfied AND they aren't already owned. Pure: the caller persists the
 * result and pays out `reward`.
 */
export function evaluateAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>,
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.has(a.slug) && a.check(ctx),
  );
}
