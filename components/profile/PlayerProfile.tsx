"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Pencil } from "lucide-react";
import type { ProfileSnapshot } from "@/lib/player/current";
import type { Locale } from "@/lib/i18n/config";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { isAvatarKey, type AvatarKey } from "@/lib/onboarding/avatars";
import { getFlag, type FlagKey } from "@/lib/onboarding/flags";
import {
  clubAccentRingStyle,
  DEFAULT_CLUB_COLOR_KEY,
  getClubColor,
  isClubColorKey,
  type ClubColorKey,
} from "@/lib/onboarding/clubColors";
import { AvatarImage } from "@/components/common/AvatarImage";
import { ProfileEditModal } from "./ProfileEditModal";
import { FlagPickerModal } from "./FlagPickerModal";
import {
  countMissionRewardsReady,
  MissionDrawer,
} from "@/components/profile/MissionDrawer";
import { calculateLevel, MAX_LEVEL } from "@/lib/game/economy";
import { playerTitleBand } from "@/lib/game/playerTitle";
import {
  ACHIEVEMENTS,
  type Achievement,
  type BadgeCategory,
  type BadgeTier,
  type PlayerStats,
} from "@/lib/game/achievements";
import type { BadgePresentation } from "@/lib/game/badgeTypes";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

/** Tier → medal ring fill. */
const TIER_RING: Record<BadgeTier, string> = {
  bronze: "from-amber-200 to-amber-600 text-amber-950",
  silver: "from-slate-100 to-slate-400 text-slate-800",
  gold: "from-yellow-200 to-amber-400 text-yellow-950",
};

/** Card chrome glow — distinct per tier (not one amber for all). */
const TIER_CARD: Record<BadgeTier, string> = {
  bronze:
    "border-amber-700/45 bg-surface shadow-[0_0_14px_rgba(180,83,9,0.35)] ring-1 ring-amber-700/30",
  silver:
    "border-slate-300/70 bg-surface shadow-[0_0_14px_rgba(148,163,184,0.4)] ring-1 ring-slate-200/50",
  gold:
    "border-yellow-400/70 bg-surface shadow-[0_0_18px_rgba(250,204,21,0.4)] ring-1 ring-yellow-300/45",
};

const TIER_MEDAL_GLOW: Record<BadgeTier, string> = {
  bronze: "shadow-[0_0_12px_rgba(180,83,9,0.55)] ring-2 ring-amber-200/55",
  silver: "shadow-[0_0_12px_rgba(203,213,225,0.65)] ring-2 ring-slate-100/70",
  gold: "shadow-[0_0_14px_rgba(250,204,21,0.65)] ring-2 ring-amber-100/75",
};

const CATEGORY_ORDER: BadgeCategory[] = [
  "skill",
  "purity",
  "dedication",
  "volume",
];

/** RTL-safe fraction: FA "۱۹ از ۱۰۰", EN LTR "19 / 100". */
function FractionText({
  cur,
  next,
  locale,
  suffix,
  className,
}: {
  cur: number | string;
  next: number | string;
  locale: Locale;
  suffix?: string;
  className?: string;
}) {
  const c = toLocaleDigits(cur, locale);
  const n = toLocaleDigits(next, locale);
  if (locale === "fa") {
    return (
      <span className={className}>
        {c} از {n}
        {suffix ? ` ${suffix}` : ""}
      </span>
    );
  }
  return (
    <bdi dir="ltr" className={className}>
      {c} / {n}
      {suffix ? ` ${suffix}` : ""}
    </bdi>
  );
}

function shortUnlockDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale === "fa" ? "fa-IR" : "en-GB", {
    month: "short",
    day: "numeric",
  });
}

export function PlayerProfile({
  profile,
  badgeCatalog = [],
  missionBoard = null,
  dailyBoard = null,
}: {
  profile: ProfileSnapshot;
  /** Admin-editable titles / art / rewards (from BadgeDefinition). */
  badgeCatalog?: BadgePresentation[];
  missionBoard?: EvaluateMissionsResult | null;
  dailyBoard?: EvaluateMissionsResult | null;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pickingFlag, setPickingFlag] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [inspectSlug, setInspectSlug] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const missionReadyCount = countMissionRewardsReady(dailyBoard, missionBoard);
  const hasMissionBoards = Boolean(
    dailyBoard?.batchId || missionBoard?.batchId,
  );

  const level = calculateLevel(profile.xp);
  const titleBand = playerTitleBand(level.level);
  const xpRemaining = Math.max(0, level.nextLevelXp - level.currentLevelXp);
  const atMaxLevel = level.level >= MAX_LEVEL;
  const flag = getFlag(profile.flag);
  const winRate =
    profile.matchesPlayed > 0
      ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100)
      : 0;

  const avatarKey: AvatarKey =
    profile.avatar && isAvatarKey(profile.avatar)
      ? profile.avatar
      : "TACTICAL_COACH";
  const colorKey: ClubColorKey = isClubColorKey(profile.colorKey)
    ? profile.colorKey
    : DEFAULT_CLUB_COLOR_KEY;
  const clubColor = getClubColor(colorKey);
  const ownedSlugs = profile.badges.map((b) => b.slug);

  const owned = new Map(profile.badges.map((b) => [b.slug, b.unlockedAt]));
  const catalogBySlug = new Map(badgeCatalog.map((b) => [b.slug, b]));

  /** Code unlock rules + admin presentation overlay. */
  const displayAchievements = ACHIEVEMENTS.map((a) => {
    const p = catalogBySlug.get(a.slug);
    if (!p) return { ...a, imageUrl: null as string | null, hidden: false };
    return {
      ...a,
      nameEn: p.nameEn,
      nameFa: p.nameFa,
      descriptionEn: p.descriptionEn,
      descriptionFa: p.descriptionFa,
      emoji: p.emoji || a.emoji,
      tier: p.tier || a.tier,
      reward: { coins: p.rewardCoins, xp: p.rewardXp },
      imageUrl: p.imageUrl,
      hidden: !p.isActive && !owned.has(a.slug),
    };
  }).filter((a) => !a.hidden);

  const playerStats: PlayerStats = {
    matchesPlayed: profile.matchesPlayed,
    matchesWon: profile.matchesWon,
    goalsTotal: profile.goalsTotal,
    highestCombo: profile.highestCombo,
    dailyStreak: profile.dailyStreak,
    longestDailyStreak: profile.longestDailyStreak,
  };

  const winHintKey =
    profile.matchesPlayed === 0 || winRate < 20
      ? "winCold"
      : winRate < 40
        ? "winFinding"
        : winRate < 60
          ? "winSolid"
          : "winLethal";
  const matchesHint =
    profile.matchesPlayed === 0
      ? t("profile.scoreHint.matchesZero")
      : t("profile.scoreHint.matchesSome", {
          n: toLocaleDigits(profile.matchesPlayed, locale),
        });
  const comboHint =
    profile.highestCombo <= 0
      ? t("profile.scoreHint.comboZero")
      : t("profile.scoreHint.comboHot");
  const streakHint =
    profile.dailyStreak > 0
      ? t("profile.scoreHint.streakLive", {
          n: toLocaleDigits(profile.dailyStreak, locale),
        })
      : profile.longestDailyStreak > 0
        ? t("profile.scoreHint.streakBest")
        : t("profile.scoreHint.streakZero");

  const secondaryStats = [
    {
      key: "matches",
      label: t("profile.matches"),
      value: toLocaleDigits(profile.matchesPlayed, locale),
      icon: "🎮",
      hint: matchesHint,
    },
    {
      key: "combo",
      label: t("profile.bestCombo"),
      value: `×${toLocaleDigits(profile.highestCombo, locale)}`,
      icon: "⚡",
      hint: comboHint,
    },
    {
      key: "streak",
      label: t("profile.bestStreak"),
      value: `${toLocaleDigits(profile.longestDailyStreak, locale)} 🔥`,
      icon: "🔥",
      hint: streakHint,
    },
  ];

  const inspectAchievement = inspectSlug
    ? displayAchievements.find((x) => x.slug === inspectSlug)
    : undefined;

  const hasMatches = profile.matchesPlayed > 0;
  const clubNameClass =
    profile.clubName.length > 22
      ? "text-base"
      : profile.clubName.length > 14
        ? "text-xl"
        : "text-2xl";

  const { nearUnlock, unlockedHonors, otherByCategory } = useMemo(() => {
    type Row = (typeof displayAchievements)[number];
    const unlocked: Row[] = [];
    const inProgress: { row: Row; ratio: number; stepsLeft: number }[] = [];
    const locked: Row[] = [];

    for (const a of displayAchievements) {
      if (owned.has(a.slug)) {
        unlocked.push(a);
        continue;
      }
      const prog = a.progress?.(playerStats);
      if (prog && prog.current > 0) {
        const ratio = prog.target > 0 ? prog.current / prog.target : 0;
        inProgress.push({
          row: a,
          ratio,
          stepsLeft: Math.max(0, prog.target - prog.current),
        });
      } else {
        locked.push(a);
      }
    }

    inProgress.sort((a, b) => b.ratio - a.ratio);
    const near = inProgress
      .filter((x) => x.ratio >= 0.4 || x.stepsLeft <= 3)
      .slice(0, 3)
      .map((x) => x.row);
    const nearSlugs = new Set(near.map((x) => x.slug));
    const remainderProgress = inProgress
      .filter((x) => !nearSlugs.has(x.row.slug))
      .map((x) => x.row);
    const otherPool = [...remainderProgress, ...locked];

    const byCat = CATEGORY_ORDER.map((cat) => ({
      cat,
      items: otherPool.filter((a) => a.category === cat),
    })).filter((g) => g.items.length > 0);

    return {
      nearUnlock: near,
      unlockedHonors: unlocked,
      otherByCategory: byCat,
    };
  }, [displayAchievements, owned, playerStats]);

  const honorsUseScroll = unlockedHonors.length % 3 !== 0;

  function openInspect(slug: string) {
    haptic(HAPTIC.light);
    setInspectSlug(slug);
  }

  return (
    <section className="flex flex-1 flex-col gap-4 pb-1">
      {/* ── Hero: FIFA-style player card ──────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="relative overflow-hidden rounded-bubble-xl border border-white/10 p-5 shadow-fantasy"
        style={{
          background: `linear-gradient(165deg, #0b1220 0%, #101828 42%, ${clubColor.hex}33 100%)`,
        }}
      >
        {/* Stadium spotlight + club wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              `radial-gradient(ellipse 80% 55% at 50% -10%, ${clubColor.washHex}55, transparent 60%)`,
              `radial-gradient(circle at 85% 20%, ${clubColor.hex}33, transparent 45%)`,
              "radial-gradient(ellipse 120% 40% at 50% 110%, rgba(0,0,0,0.45), transparent 55%)",
            ].join(", "),
          }}
        />
        {/* Soft pitch stripe hint */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-[0.12]"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,255,255,0.35) 18px, rgba(255,255,255,0.35) 20px)",
          }}
        />

        <div className="relative flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="relative shrink-0 rounded-full p-1"
            style={{
              ...clubAccentRingStyle(colorKey),
              boxShadow: `0 0 0 3px ${clubColor.hex}, 0 0 28px ${clubColor.hex}66`,
            }}
          >
            <AvatarImage
              avatarKey={avatarKey}
              colorKey={colorKey}
              className="h-24 w-24 rounded-full shadow-fantasy ring-2 ring-black/40"
            />
            {/* Level medal — intersects avatar ring */}
            <div
              className="absolute -start-1 -top-1 flex h-11 min-w-11 flex-col items-center justify-center rounded-full border-2 border-amber-100/90 bg-linear-to-b from-amber-200 via-yellow-400 to-amber-600 px-1 shadow-[0_0_14px_rgba(250,204,21,0.65)]"
              aria-label={t("profile.level", {
                n: toLocaleDigits(level.level, locale),
              })}
            >
              <span className="font-display text-[9px] font-bold leading-none tracking-wide text-amber-950/80">
                LV
              </span>
              <span className="font-display text-sm font-black leading-none text-amber-950">
                {toLocaleDigits(level.level, locale)}
              </span>
            </div>
            {/* Tappable club flag pin */}
            <button
              type="button"
              onClick={() => setPickingFlag(true)}
              aria-label={t("profile.flag.title")}
              className="absolute -end-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b1220] bg-[#151c2c] text-2xl shadow-fantasy transition-transform active:scale-90"
            >
              {flag.emoji}
            </button>
          </motion.div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300/90">
              {t(`profile.title.${titleBand}`)}
            </p>
            <h1
              className={[
                "line-clamp-2 break-words font-display font-bold leading-snug text-white drop-shadow-sm",
                clubNameClass,
              ].join(" ")}
            >
              {profile.clubName}
            </h1>
            <p className="mt-0.5 line-clamp-2 break-words font-body text-sm font-semibold text-white/55">
              {profile.stadiumName || t("profile.noStadium")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t("profile.edit.button")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/85 shadow-fantasy-sm backdrop-blur-sm transition-transform active:scale-95"
          >
            <Pencil className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {hasMissionBoards && (
          <motion.button
            type="button"
            onClick={() => {
              haptic(HAPTIC.light);
              setMissionsOpen(true);
            }}
            aria-label={t("missions.openDrawer")}
            whileTap={{ scale: 0.98 }}
            className="relative mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-bubble border border-white/15 bg-white/10 font-display text-sm font-bold text-white backdrop-blur-sm"
          >
            <span aria-hidden>🎯</span>
            <span>{t("profile.missionsChip")}</span>
            {missionReadyCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 font-display text-[11px] font-bold text-secondary-foreground">
                {toLocaleDigits(Math.min(missionReadyCount, 9), locale)}
                {missionReadyCount > 9 ? "+" : ""}
              </span>
            )}
          </motion.button>
        )}

        {/* Gaming XP resource bar — level already on avatar medal */}
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-center justify-end">
            <span className="font-display text-xs font-semibold tabular-nums text-white/55">
              {locale === "fa" ? (
                t("profile.xpOf", {
                  cur: toLocaleDigits(level.currentLevelXp, locale),
                  next: toLocaleDigits(level.nextLevelXp, locale),
                })
              ) : (
                <FractionText
                  cur={level.currentLevelXp}
                  next={level.nextLevelXp}
                  locale={locale}
                  suffix="XP"
                />
              )}
            </span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/15 bg-black/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]">
            <motion.div
              className="relative h-full rounded-full bg-linear-to-r from-emerald-400 via-lime-300 to-amber-300 shadow-[0_0_12px_rgba(132,204,22,0.55)]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(level.progress * 100)}%` }}
              transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/25"
              />
            </motion.div>
          </div>
          <p className="mt-2 font-display text-[11px] font-bold text-amber-200/90">
            {atMaxLevel
              ? t("profile.xpMaxLevel")
              : t("profile.xpToNext", {
                  n: toLocaleDigits(xpRemaining, locale),
                })}
          </p>
        </div>
      </motion.header>

      {/* ── Stadium scoreboard ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.08 }}
        className="relative overflow-hidden rounded-bubble-xl border border-amber-400/35 p-4 shadow-[0_0_24px_rgba(245,158,11,0.12)]"
        style={{
          background:
            "linear-gradient(180deg, #0f172a 0%, #111827 55%, #0b1220 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(250,204,21,0.18), transparent 65%)",
          }}
        />
        <div className="relative mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-amber-300/95">
            {t("profile.scoreboardTitle")}
          </h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-display text-[10px] font-bold text-white/50">
            {t("profile.statsTitle")}
          </span>
        </div>

        {!hasMatches ? (
          <div className="relative rounded-bubble border border-dashed border-amber-300/30 bg-black/30 px-4 py-6 text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)]">
            <p className="text-3xl" aria-hidden>
              🏟️
            </p>
            <p className="mt-2 font-body text-sm font-semibold leading-relaxed text-white/75">
              {t("profile.scoreboardEmpty")}
            </p>
            <Link
              href="/play"
              className="mt-4 inline-flex h-11 min-w-[10rem] items-center justify-center rounded-bubble bg-secondary px-5 font-display text-sm font-bold text-secondary-foreground shadow-fantasy active:scale-[0.98]"
            >
              {t("profile.scoreboardEmptyCta")}
            </Link>
          </div>
        ) : (
          <>
            <div className="relative mb-3 rounded-bubble border border-amber-300/25 bg-black/35 px-4 py-4 text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.45)]">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
                🏆 {t("profile.winRate")}
              </p>
              <p className="mt-1 font-display text-5xl font-black tabular-nums leading-none text-amber-300 drop-shadow-[0_0_18px_rgba(252,211,77,0.45)]">
                {toLocaleDigits(winRate, locale)}
                <span className="text-3xl">
                  {locale === "fa" ? "٪" : "%"}
                </span>
              </p>
              <p className="mt-2 font-body text-xs font-semibold text-white/55">
                {t(`profile.scoreHint.${winHintKey}`)}
              </p>
            </div>

            <div className="relative grid grid-cols-3 gap-2">
              {secondaryStats.map((s, i) => (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 + i * 0.05 }}
                  className="rounded-bubble border border-white/10 bg-white/5 px-2 py-2.5 text-center shadow-[inset_0_1px_4px_rgba(0,0,0,0.35)]"
                >
                  <p className="flex items-center justify-center gap-1 font-display text-[10px] font-bold text-white/50">
                    <span aria-hidden>{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                  </p>
                  <p className="mt-1 font-display text-xl font-black tabular-nums text-white">
                    {s.value}
                  </p>
                  <p className="mt-0.5 line-clamp-2 font-body text-[9px] font-semibold leading-tight text-white/40">
                    {s.hint}
                  </p>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* ── Trophy cabinet ───────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-black text-surface-foreground">
            {t("profile.trophies")}
          </h2>
          <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-display text-[11px] font-bold text-muted-foreground">
            {locale === "fa" ? (
              t("profile.trophiesCountLabel", {
                unlocked: toLocaleDigits(unlockedHonors.length, locale),
                total: toLocaleDigits(displayAchievements.length, locale),
              })
            ) : (
              <bdi dir="ltr">
                {t("profile.trophiesCountLabel", {
                  unlocked: String(unlockedHonors.length),
                  total: String(displayAchievements.length),
                })}
              </bdi>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {nearUnlock.length > 0 && (
            <div>
              <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-secondary">
                {t("profile.trophyNear")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {nearUnlock.map((a, i) => (
                  <BadgeTile
                    key={a.slug}
                    achievement={a}
                    imageUrl={a.imageUrl}
                    unlockedAt={owned.get(a.slug)}
                    player={playerStats}
                    locale={locale}
                    delay={0.04 + i * 0.04}
                    onInspect={() => openInspect(a.slug)}
                  />
                ))}
              </div>
            </div>
          )}

          {unlockedHonors.length > 0 && (
            <div>
              <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-amber-700">
                {t("profile.trophyHonors")}
              </p>
              {honorsUseScroll ? (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {unlockedHonors.map((a, i) => (
                    <div
                      key={a.slug}
                      className="w-[31%] min-w-[6.75rem] shrink-0 snap-start"
                    >
                      <BadgeTile
                        achievement={a}
                        imageUrl={a.imageUrl}
                        unlockedAt={owned.get(a.slug)}
                        player={playerStats}
                        locale={locale}
                        delay={0.06 + i * 0.04}
                        onInspect={() => openInspect(a.slug)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {unlockedHonors.map((a, i) => (
                    <BadgeTile
                      key={a.slug}
                      achievement={a}
                      imageUrl={a.imageUrl}
                      unlockedAt={owned.get(a.slug)}
                      player={playerStats}
                      locale={locale}
                      delay={0.06 + i * 0.04}
                      onInspect={() => openInspect(a.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {otherByCategory.length > 0 && (
            <div className="rounded-bubble border border-border bg-muted/30">
              <button
                type="button"
                onClick={() => {
                  haptic(HAPTIC.light);
                  setOthersOpen((v) => !v);
                }}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5"
                aria-expanded={othersOpen}
              >
                <span className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("profile.trophyOther")}
                </span>
                <span className="flex items-center gap-1.5 font-display text-[10px] font-bold text-muted-foreground">
                  {othersOpen
                    ? t("profile.trophyOtherHide")
                    : t("profile.trophyOtherShow")}
                  <ChevronDown
                    className={[
                      "h-4 w-4 transition-transform",
                      othersOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {othersOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 px-3 pb-3">
                      {otherByCategory.map(({ cat, items }) => (
                        <div key={cat}>
                          <p className="mb-1.5 font-display text-[11px] font-bold text-primary">
                            {t(`profile.cat.${cat}`)}
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {items.map((a, i) => (
                              <BadgeTile
                                key={a.slug}
                                achievement={a}
                                imageUrl={a.imageUrl}
                                unlockedAt={owned.get(a.slug)}
                                player={playerStats}
                                locale={locale}
                                delay={i * 0.03}
                                onInspect={() => openInspect(a.slug)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {hasMissionBoards && (
        <MissionDrawer
          open={missionsOpen}
          onOpenChange={setMissionsOpen}
          dailyBoard={dailyBoard}
          missionBoard={missionBoard}
          onEconomyUpdate={() => {
            router.refresh();
          }}
        />
      )}

      <AnimatePresence>
        {editing && (
          <ProfileEditModal
            initial={{
              managerName: profile.managerName,
              clubName: profile.clubName,
              stadiumName: profile.stadiumName ?? "",
              avatar: avatarKey,
              colorKey,
            }}
            ownedBadgeSlugs={ownedSlugs}
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pickingFlag && (
          <FlagPickerModal
            current={flag.key as FlagKey}
            level={level.level}
            onClose={() => setPickingFlag(false)}
            onSaved={() => {
              setPickingFlag(false);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectAchievement && (
          <TrophyInspectSheet
            key={inspectAchievement.slug}
            achievement={inspectAchievement}
            imageUrl={inspectAchievement.imageUrl}
            unlockedAt={owned.get(inspectAchievement.slug)}
            player={playerStats}
            locale={locale}
            onClose={() => setInspectSlug(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

type TrophyState = "unlocked" | "progress" | "locked";

function resolveTrophyState(
  unlockedAt: string | undefined,
  prog: { current: number; target: number } | undefined,
): TrophyState {
  if (unlockedAt) return "unlocked";
  if (prog && prog.current > 0 && prog.current < prog.target) return "progress";
  if (prog && prog.current >= prog.target) return "progress";
  return "locked";
}

type BadgeTileProps = {
  achievement: Achievement & { imageUrl?: string | null };
  imageUrl?: string | null;
  unlockedAt: string | undefined;
  player: PlayerStats;
  locale: Locale;
  delay: number;
  onInspect: () => void;
};

/**
 * Trophy tile with three visual states: locked (inset + silhouette),
 * in-progress (bar + nudge), unlocked (tier-colored glow + date/tier).
 */
function BadgeTile({
  achievement: a,
  imageUrl,
  unlockedAt,
  player,
  locale,
  delay,
  onInspect,
}: BadgeTileProps) {
  const { t } = useTranslation();
  const name = locale === "fa" ? a.nameFa : a.nameEn;
  const prog = !unlockedAt ? a.progress?.(player) : undefined;
  const state = resolveTrophyState(unlockedAt, prog);
  const pct = prog
    ? Math.min(100, Math.round((prog.current / prog.target) * 100))
    : 0;
  const stepsLeft = prog ? Math.max(0, prog.target - prog.current) : 0;
  const unlockLabel = unlockedAt
    ? shortUnlockDate(unlockedAt, locale) || t(`profile.tier.${a.tier}`)
    : t(`profile.tier.${a.tier}`);

  return (
    <motion.button
      type="button"
      onClick={onInspect}
      initial={
        state === "unlocked"
          ? { opacity: 0, scale: 0.6, y: 12 }
          : { opacity: 0, scale: 0.92 }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        state === "unlocked"
          ? { delay, type: "spring", stiffness: 320, damping: 16 }
          : { delay, type: "spring", stiffness: 260, damping: 20 }
      }
      whileTap={{ scale: 0.96 }}
      className={[
        "relative flex w-full min-h-[7.5rem] flex-col items-center gap-1.5 rounded-bubble border p-2.5 text-center transition-colors",
        state === "unlocked"
          ? TIER_CARD[a.tier]
          : state === "progress"
            ? "border-primary/40 bg-surface shadow-fantasy-sm"
            : "border-black/10 bg-[#c5d0c8]/65 shadow-[inset_0_2px_8px_rgba(0,0,0,0.16)]",
      ].join(" ")}
      aria-label={name}
    >
      <span
        className={[
          "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-2xl",
          state === "unlocked"
            ? `bg-linear-to-b ${TIER_RING[a.tier]} ${TIER_MEDAL_GLOW[a.tier]}`
            : state === "progress"
              ? "bg-muted/80 grayscale-[0.25]"
              : "bg-[#a8b5ae]/90 grayscale opacity-60",
        ].join(" ")}
        aria-hidden
      >
        {imageUrl && state !== "locked" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className={[
              "h-full w-full object-cover",
              state === "progress" ? "grayscale-[0.35] opacity-80" : "",
            ].join(" ")}
          />
        ) : imageUrl && state === "locked" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover grayscale opacity-55"
          />
        ) : (
          a.emoji
        )}
        {state === "locked" && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/50 bg-slate-800 text-[9px] leading-none shadow-sm">
            🔒
          </span>
        )}
      </span>

      <p
        className={[
          "line-clamp-1 w-full font-display text-[11px] font-bold",
          state === "unlocked"
            ? "text-surface-foreground"
            : state === "progress"
              ? "text-surface-foreground/90"
              : "text-slate-600",
        ].join(" ")}
      >
        {name}
      </p>

      {state === "unlocked" ? (
        <span className="font-display text-[10px] font-bold text-muted-foreground">
          {unlockLabel}
        </span>
      ) : prog ? (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p
            className={[
              "mt-1 font-display text-[10px] font-bold",
              state === "progress" ? "text-primary" : "text-slate-500",
            ].join(" ")}
          >
            <FractionText
              cur={prog.current}
              next={prog.target}
              locale={locale}
            />
          </p>
          {state === "progress" && stepsLeft > 0 && stepsLeft <= 3 && (
            <p className="font-body text-[9px] font-semibold text-accent-deep">
              {t("profile.trophyStepsLeft", {
                n: toLocaleDigits(stepsLeft, locale),
              })}
            </p>
          )}
        </div>
      ) : (
        <span className="font-display text-[10px] font-bold text-slate-500">
          {t("profile.trophyLocked")}
        </span>
      )}
    </motion.button>
  );
}

type TrophyInspectSheetProps = {
  achievement: Achievement & { imageUrl?: string | null };
  imageUrl?: string | null;
  unlockedAt: string | undefined;
  player: PlayerStats;
  locale: Locale;
  onClose: () => void;
};

const TIER_SHEET_WASH: Record<BadgeTier, string> = {
  bronze: "from-amber-900/90 via-[#1a140c] to-[#0f172a]",
  silver: "from-slate-600/80 via-[#151a22] to-[#0f172a]",
  gold: "from-amber-700/85 via-[#1a1608] to-[#0f172a]",
};

function TrophyInspectSheet({
  achievement: a,
  imageUrl,
  unlockedAt,
  player,
  locale,
  onClose,
}: TrophyInspectSheetProps) {
  const { t } = useTranslation();
  const name = locale === "fa" ? a.nameFa : a.nameEn;
  const desc = locale === "fa" ? a.descriptionFa : a.descriptionEn;
  const prog = !unlockedAt ? a.progress?.(player) : undefined;
  const state = resolveTrophyState(unlockedAt, prog);
  const pct = prog
    ? Math.min(100, Math.round((prog.current / prog.target) * 100))
    : 0;
  const stepsLeft = prog ? Math.max(0, prog.target - prog.current) : 0;
  const hasReward = a.reward.coins > 0 || a.reward.xp > 0;
  const dateLabel = unlockedAt ? shortUnlockDate(unlockedAt, locale) : "";

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        aria-label={t("profile.trophyClose")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[5px]"
      />

      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby="trophy-inspect-title"
        initial={{ y: 56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-mobile overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#fffdf8] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]"
      >
        {/* Drag handle */}
        <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2.5">
          <span
            aria-hidden
            className="h-1 w-10 rounded-full bg-white/35"
          />
        </div>

        {/* Tier hero */}
        <div
          className={[
            "relative bg-linear-to-b px-5 pb-5 pt-7 text-center",
            TIER_SHEET_WASH[a.tier],
          ].join(" ")}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 20%, rgba(255,255,255,0.14), transparent 60%)",
            }}
          />

          <motion.span
            initial={{ scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
            className={[
              "relative mx-auto flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-full text-5xl",
              state === "unlocked"
                ? `bg-linear-to-b ${TIER_RING[a.tier]} ${TIER_MEDAL_GLOW[a.tier]}`
                : "bg-white/10 grayscale opacity-70 ring-2 ring-white/15",
            ].join(" ")}
            aria-hidden
          >
            {imageUrl && (state === "unlocked" || state === "progress") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className={[
                  "h-full w-full object-cover",
                  state === "progress" ? "grayscale opacity-80" : "",
                ].join(" ")}
              />
            ) : (
              a.emoji
            )}
            {state === "locked" && (
              <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-slate-800 text-sm shadow-md">
                🔒
              </span>
            )}
          </motion.span>

          <div className="relative mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-amber-100">
              {t(`profile.tier.${a.tier}`)}
            </span>
            <span
              className={[
                "rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold",
                state === "unlocked"
                  ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-100"
                  : state === "progress"
                    ? "border-sky-300/40 bg-sky-400/20 text-sky-100"
                    : "border-white/15 bg-white/10 text-white/70",
              ].join(" ")}
            >
              {state === "unlocked"
                ? dateLabel
                  ? t("profile.unlockedOn", { date: dateLabel })
                  : t("profile.trophyUnlocked")
                : state === "progress"
                  ? t("profile.trophyInProgress")
                  : t("profile.trophyLocked")}
            </span>
          </div>

          <h3
            id="trophy-inspect-title"
            className="relative mt-2 font-display text-2xl font-black text-white drop-shadow-sm"
          >
            {name}
          </h3>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-4 pb-4 pt-4">
          <div className="rounded-bubble border border-border/80 bg-white px-3.5 py-3 text-start shadow-fantasy-sm">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-primary">
              {state === "unlocked"
                ? t("profile.trophyRequirement")
                : t("profile.trophyHowTo")}
            </p>
            <p className="mt-1 font-body text-sm font-semibold leading-relaxed text-surface-foreground">
              {desc}
            </p>
          </div>

          {state !== "unlocked" && prog && (
            <div className="rounded-bubble border border-primary/20 bg-primary/5 px-3.5 py-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="font-display text-[10px] font-bold uppercase tracking-wider text-primary">
                  {t("profile.trophyProgress")}
                </p>
                <p className="font-display text-xs font-bold text-primary">
                  <FractionText
                    cur={prog.current}
                    next={prog.target}
                    locale={locale}
                  />
                </p>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_3px_rgba(0,0,0,0.18)]">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              </div>
              {stepsLeft > 0 && stepsLeft <= 3 && (
                <p className="mt-1.5 font-body text-[11px] font-bold text-accent-deep">
                  {t("profile.trophyStepsLeft", {
                    n: toLocaleDigits(stepsLeft, locale),
                  })}
                </p>
              )}
            </div>
          )}

          {hasReward && (
            <div className="rounded-bubble border border-amber-300/40 bg-linear-to-r from-amber-50 to-orange-50 px-3.5 py-3">
              <p className="font-display text-[10px] font-bold uppercase tracking-wider text-amber-800">
                {state === "unlocked"
                  ? t("profile.rewardEarned")
                  : t("profile.rewardOnUnlock")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.reward.coins > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-white px-3 py-1.5 font-display text-sm font-bold text-amber-900 shadow-sm">
                    <span aria-hidden>🪙</span>
                    {toLocaleDigits(a.reward.coins, locale)}
                  </span>
                )}
                {a.reward.xp > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/50 bg-white px-3 py-1.5 font-display text-sm font-bold text-sky-900 shadow-sm">
                    <span aria-hidden>⭐</span>
                    {toLocaleDigits(a.reward.xp, locale)} XP
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-bubble bg-primary font-display text-base font-bold text-primary-foreground shadow-[0_4px_0_0_hsl(var(--primary)/0.45)] transition-transform active:translate-y-0.5 active:shadow-none"
          >
            {t("profile.trophyClose")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
