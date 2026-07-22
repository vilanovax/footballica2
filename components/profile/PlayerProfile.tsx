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
import { AvatarImage } from "@/components/common/AvatarImage";
import { ProfileEditModal } from "./ProfileEditModal";
import { FlagPickerModal } from "./FlagPickerModal";
import { calculateLevel } from "@/lib/game/economy";
import {
  ACHIEVEMENTS,
  type Achievement,
  type BadgeCategory,
  type BadgeTier,
  type PlayerStats,
} from "@/lib/game/achievements";
import { MissionBoard } from "@/components/profile/MissionBoard";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

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
  missionBoard = null,
  dailyBoard = null,
}: {
  profile: ProfileSnapshot;
  missionBoard?: EvaluateMissionsResult | null;
  dailyBoard?: EvaluateMissionsResult | null;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pickingFlag, setPickingFlag] = useState(false);

  const level = calculateLevel(profile.xp);
  const flag = getFlag(profile.flag);
  const winRate =
    profile.matchesPlayed > 0
      ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100)
      : 0;

  const avatarKey: AvatarKey =
    profile.avatar && isAvatarKey(profile.avatar)
      ? profile.avatar
      : "TACTICAL_COACH";
  const ownedSlugs = profile.badges.map((b) => b.slug);

  const owned = new Map(profile.badges.map((b) => [b.slug, b.unlockedAt]));

  const playerStats: PlayerStats = {
    matchesPlayed: profile.matchesPlayed,
    matchesWon: profile.matchesWon,
    goalsTotal: profile.goalsTotal,
    highestCombo: profile.highestCombo,
    dailyStreak: profile.dailyStreak,
    longestDailyStreak: profile.longestDailyStreak,
  };

  const stats = [
    { label: t("profile.matches"), value: toLocaleDigits(profile.matchesPlayed, locale), icon: "🎮" },
    { label: t("profile.winRate"), value: `${toLocaleDigits(winRate, locale)}${locale === "fa" ? "٪" : "%"}`, icon: "🏆" },
    { label: t("profile.bestCombo"), value: `×${toLocaleDigits(profile.highestCombo, locale)}`, icon: "⚡" },
    { label: t("profile.bestStreak"), value: `${toLocaleDigits(profile.longestDailyStreak, locale)} 🔥`, icon: "📅" },
  ];

  return (
    <section className="flex flex-1 flex-col gap-5">
      {/* ── Hero: avatar + identity + level/XP ────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy"
      >
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="relative shrink-0"
          >
            <AvatarImage
              avatarKey={avatarKey}
              className="h-20 w-20 rounded-full shadow-fantasy"
            />
            {/* Tappable club flag pin → opens the flag picker */}
            <button
              type="button"
              onClick={() => setPickingFlag(true)}
              aria-label={t("profile.flag.title")}
              className="absolute -end-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-surface text-2xl shadow-fantasy transition-transform active:scale-90"
            >
              {flag.emoji}
            </button>
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
              {t("profile.eyebrow")}
            </p>
            <h1 className="truncate font-display text-2xl font-bold leading-tight text-surface-foreground">
              {profile.clubName}
            </h1>
            <p className="truncate font-body text-sm font-semibold text-muted-foreground">
              {profile.stadiumName || t("profile.noStadium")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t("profile.edit.button")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-fantasy-sm transition-transform active:scale-95"
          >
            <Pencil className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Level + XP */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary/15 px-3 py-1 font-display text-sm font-bold text-primary">
              {t("profile.level", { n: toLocaleDigits(level.level, locale) })}
            </span>
            <span className="font-display text-xs font-semibold text-muted-foreground">
              {t("profile.xp", {
                cur: toLocaleDigits(level.currentLevelXp, locale),
                next: toLocaleDigits(level.nextLevelXp, locale),
              })}
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(level.progress * 100)}%` }}
              transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.header>

      {(dailyBoard?.batchId || missionBoard?.batchId) && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-secondary">
            {t("missions.sectionLive")}
          </h2>
          {dailyBoard?.batchId && (
            <MissionBoard initialBoard={dailyBoard} variant="daily" />
          )}
          {missionBoard?.batchId && (
            <MissionBoard initialBoard={missionBoard} variant="campaign" />
          )}
        </div>
      )}

      {/* ── Career stats ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t("profile.statsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="rounded-bubble border border-border bg-surface p-4 shadow-fantasy-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  {s.icon}
                </span>
                <span className="font-body text-xs font-semibold text-muted-foreground">
                  {s.label}
                </span>
              </div>
              <p className="mt-1 font-display text-2xl font-bold text-surface-foreground">
                {s.value}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Trophy cabinet (permanent badges — separate from LiveOps) ───── */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t("missions.sectionTrophies")}
          </h2>
          <span className="font-display text-xs font-bold text-accent-deep">
            {t("profile.trophiesCount", {
              unlocked: toLocaleDigits(owned.size, locale),
              total: toLocaleDigits(ACHIEVEMENTS.length, locale),
            })}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {CATEGORY_ORDER.map((cat) => {
            const items = ACHIEVEMENTS.filter((a) => a.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <p className="mb-1.5 font-display text-[11px] font-bold text-primary">
                  {t(`profile.cat.${cat}`)}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((a, i) => (
                    <BadgeTile
                      key={a.slug}
                      achievement={a}
                      unlockedAt={owned.get(a.slug)}
                      player={playerStats}
                      locale={locale}
                      delay={i * 0.04}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <ProfileEditModal
            initial={{
              managerName: profile.managerName,
              clubName: profile.clubName,
              stadiumName: profile.stadiumName ?? "",
              avatar: avatarKey,
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
    </section>
  );
}

type BadgeTileProps = {
  achievement: Achievement;
  unlockedAt: string | undefined;
  player: PlayerStats;
  locale: Locale;
  delay: number;
};

/**
 * Compact square badge tile for the trophy grid. Unlocked badges show a
 * tier-ringed emoji + a check; locked ones grayscale with a slim progress bar,
 * keeping the whole cabinet scannable in a fraction of the vertical space.
 */
function BadgeTile({
  achievement: a,
  unlockedAt,
  player,
  locale,
  delay,
}: BadgeTileProps) {
  const unlocked = Boolean(unlockedAt);
  const name = locale === "fa" ? a.nameFa : a.nameEn;
  const prog = !unlocked ? a.progress?.(player) : undefined;
  const pct = prog ? Math.min(100, Math.round((prog.current / prog.target) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
      className={[
        "relative flex flex-col items-center gap-1.5 rounded-bubble border p-2.5 text-center shadow-fantasy-sm",
        unlocked ? "border-border bg-surface" : "border-border bg-muted/40",
      ].join(" ")}
      title={locale === "fa" ? a.descriptionFa : a.descriptionEn}
    >
      <span
        className={[
          "flex h-12 w-12 items-center justify-center rounded-full text-2xl",
          unlocked
            ? `bg-linear-to-b shadow-fantasy ${TIER_RING[a.tier]}`
            : "bg-muted grayscale opacity-50",
        ].join(" ")}
        aria-hidden
      >
        {unlocked ? a.emoji : "🔒"}
      </span>

      <p
        className={[
          "line-clamp-1 w-full font-display text-[11px] font-bold",
          unlocked ? "text-surface-foreground" : "text-muted-foreground",
        ].join(" ")}
      >
        {name}
      </p>

      {!unlocked && prog ? (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 font-display text-[10px] font-bold text-muted-foreground">
            {toLocaleDigits(prog.current, locale)} /{" "}
            {toLocaleDigits(prog.target, locale)}
          </p>
        </div>
      ) : (
        <span
          className={[
            "font-display text-[10px] font-bold",
            unlocked ? "text-primary" : "text-muted-foreground/60",
          ].join(" ")}
        >
          {unlocked ? "✓" : "—"}
        </span>
      )}
    </motion.div>
  );
}
