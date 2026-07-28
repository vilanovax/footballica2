"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil } from "lucide-react";
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

/** Tier → medal ring styling (matches the unlock popup). */
const TIER_RING: Record<BadgeTier, string> = {
  bronze: "from-amber-200 to-amber-500 text-amber-900",
  silver: "from-slate-200 to-slate-400 text-slate-800",
  gold: "from-yellow-200 to-yellow-500 text-yellow-900",
};

const CATEGORY_ORDER: BadgeCategory[] = [
  "skill",
  "purity",
  "dedication",
  "volume",
];

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

  return (
    <section className="flex flex-1 flex-col gap-5">
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
            <h1 className="truncate font-display text-2xl font-bold leading-tight text-white drop-shadow-sm">
              {profile.clubName}
            </h1>
            <p className="truncate font-body text-sm font-semibold text-white/55">
              {profile.stadiumName || t("profile.noStadium")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-bubble border border-white/15 bg-black/35 p-1 backdrop-blur-sm">
            {hasMissionBoards && (
              <motion.button
                type="button"
                onClick={() => {
                  haptic(HAPTIC.light);
                  setMissionsOpen(true);
                }}
                aria-label={t("missions.openDrawer")}
                className="relative flex h-9 w-9 items-center justify-center rounded-bubble text-lg"
                whileTap={{ scale: 0.92 }}
              >
                <span aria-hidden>🎯</span>
                {missionReadyCount > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 font-display text-[10px] font-bold text-secondary-foreground ring-2 ring-[#0b1220]">
                    {toLocaleDigits(Math.min(missionReadyCount, 9), locale)}
                    {missionReadyCount > 9 ? "+" : ""}
                  </span>
                )}
              </motion.button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t("profile.edit.button")}
              className="flex h-9 w-9 items-center justify-center rounded-bubble text-white/70 transition-transform active:scale-95"
            >
              <Pencil className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Gaming XP resource bar */}
        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-display text-xs font-bold text-white/70">
              {t("profile.levelShort", {
                n: toLocaleDigits(level.level, locale),
              })}
            </span>
            <span className="font-display text-xs font-semibold tabular-nums text-white/55">
              {t("profile.xp", {
                cur: toLocaleDigits(level.currentLevelXp, locale),
                next: toLocaleDigits(level.nextLevelXp, locale),
              })}
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

        {/* Primary: Win Rate */}
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

        {/* Secondary chips */}
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
      </motion.div>

      {/* ── Trophy cabinet ───────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 overflow-hidden rounded-bubble-xl border border-amber-400/30 bg-linear-to-br from-[#1a1408] via-[#241a0c] to-[#0f172a] px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.12)]">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
                {t("profile.trophiesSubtitle")}
              </p>
              <h2 className="font-display text-xl font-black text-amber-100">
                {t("profile.trophies")}
              </h2>
            </div>
            <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 font-display text-xs font-bold text-amber-200">
              {t("profile.trophiesCount", {
                unlocked: toLocaleDigits(
                  displayAchievements.filter((a) => owned.has(a.slug)).length,
                  locale,
                ),
                total: toLocaleDigits(displayAchievements.length, locale),
              })}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((cat) => {
            const items = displayAchievements.filter((a) => a.category === cat);
            if (items.length === 0) return null;
            const catUnlocked = items.filter((a) => owned.has(a.slug)).length;
            return (
              <div key={cat}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-display text-[11px] font-bold uppercase tracking-wider text-primary">
                    {t(`profile.cat.${cat}`)}
                  </p>
                  <span className="font-display text-[10px] font-bold text-muted-foreground">
                    {toLocaleDigits(catUnlocked, locale)}/
                    {toLocaleDigits(items.length, locale)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((a, i) => (
                    <BadgeTile
                      key={a.slug}
                      achievement={a}
                      imageUrl={a.imageUrl}
                      unlockedAt={owned.get(a.slug)}
                      player={playerStats}
                      locale={locale}
                      delay={0.05 + i * 0.05}
                      onInspect={() => {
                        haptic(HAPTIC.light);
                        setInspectSlug(a.slug);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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
 * in-progress (bar + nudge), unlocked (tier glow + check).
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
        "relative flex min-h-[7.5rem] flex-col items-center gap-1.5 rounded-bubble border p-2.5 text-center transition-colors",
        state === "unlocked"
          ? "border-amber-300/50 bg-surface shadow-[0_0_16px_rgba(251,191,36,0.35)]"
          : state === "progress"
            ? "border-primary/35 bg-surface/90 shadow-fantasy-sm"
            : "border-black/10 bg-[#c5d0c8]/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.18)]",
      ].join(" ")}
      aria-label={name}
    >
      <span
        className={[
          "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-2xl",
          state === "unlocked"
            ? `bg-linear-to-b ${TIER_RING[a.tier]} shadow-[0_0_12px_rgba(251,191,36,0.55)]`
            : state === "progress"
              ? "bg-muted/80 grayscale-[0.35]"
              : "bg-[#9aa89e]/80 grayscale opacity-55",
        ].join(" ")}
        aria-hidden
      >
        {imageUrl && state === "unlocked" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={state === "locked" ? "opacity-70" : undefined}>
            {a.emoji}
          </span>
        )}
        {state === "locked" && (
          <span className="absolute -end-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-slate-700 text-[10px] shadow-sm">
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
        <span className="font-display text-[10px] font-bold text-primary">
          ✓ {t("profile.trophyUnlocked")}
        </span>
      ) : state === "progress" && prog ? (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 font-display text-[10px] font-bold text-primary">
            {toLocaleDigits(prog.current, locale)} /{" "}
            {toLocaleDigits(prog.target, locale)}
          </p>
          {stepsLeft > 0 && (
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

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby="trophy-inspect-title"
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-bubble-xl border border-amber-300/30 bg-surface p-5 shadow-fantasy"
      >
        <div className="flex flex-col items-center text-center">
          <span
            className={[
              "flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-4xl",
              state === "unlocked"
                ? `bg-linear-to-b ${TIER_RING[a.tier]} shadow-[0_0_22px_rgba(251,191,36,0.55)]`
                : "bg-muted grayscale opacity-70",
            ].join(" ")}
            aria-hidden
          >
            {imageUrl && state === "unlocked" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              a.emoji
            )}
          </span>
          <p className="mt-3 font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {state === "unlocked"
              ? t("profile.trophyUnlocked")
              : state === "progress"
                ? t("profile.trophyInProgress")
                : t("profile.trophyLocked")}
          </p>
          <h3
            id="trophy-inspect-title"
            className="mt-1 font-display text-xl font-black text-surface-foreground"
          >
            {name}
          </h3>
          <div className="mt-3 w-full rounded-bubble border border-border bg-muted/40 px-3 py-2.5 text-start">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-primary">
              {t("profile.trophyHowTo")}
            </p>
            <p className="mt-1 font-body text-sm font-semibold text-surface-foreground">
              {desc}
            </p>
          </div>
          {state === "progress" && prog && (
            <div className="mt-3 w-full">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 font-display text-xs font-bold text-primary">
                {toLocaleDigits(prog.current, locale)} /{" "}
                {toLocaleDigits(prog.target, locale)}
                {stepsLeft > 0
                  ? ` · ${t("profile.trophyStepsLeft", {
                      n: toLocaleDigits(stepsLeft, locale),
                    })}`
                  : ""}
              </p>
            </div>
          )}
          {(a.reward.coins > 0 || a.reward.xp > 0) && (
            <p className="mt-3 font-display text-xs font-bold text-amber-700">
              {t("profile.reward")}:{" "}
              {a.reward.coins > 0
                ? `🪙 ${toLocaleDigits(a.reward.coins, locale)}`
                : ""}
              {a.reward.coins > 0 && a.reward.xp > 0 ? " · " : ""}
              {a.reward.xp > 0
                ? `⭐ ${toLocaleDigits(a.reward.xp, locale)} XP`
                : ""}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-bubble bg-primary font-display text-sm font-bold text-primary-foreground shadow-fantasy active:scale-[0.98]"
          >
            {t("profile.trophyClose")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
