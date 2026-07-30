"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import type { LeaderboardRow } from "@/actions/getLeaderboard";
import type { HallOfFameWeek } from "@/actions/getHallOfFame";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatNumber, toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { HallOfFamePanel } from "./HallOfFamePanel";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  WEEKLY_PRIZE_TIERS,
  weeklyChampionCoins,
} from "@/lib/game/weeklyPrizes";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import { RankArt, medalKindForPlace } from "@/components/leaderboard/RankArt";
import { shortClubName } from "@/lib/leaderboard/displayName";

type LeaderboardListProps = {
  rows: LeaderboardRow[];
  resetsInDays?: number;
  hallOfFame?: HallOfFameWeek[];
  currentUserRow?: LeaderboardRow | null;
};

type TabKey = "weekly" | "hof";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 26 },
  },
} as const;

function tierForRank(rank: number): "elite" | "contender" | "pack" | "climbing" {
  if (rank <= 3) return "elite";
  if (rank <= 10) return "contender";
  if (rank <= 25) return "pack";
  return "climbing";
}

export function LeaderboardList({
  rows,
  resetsInDays = 7,
  hallOfFame = [],
  currentUserRow = null,
}: LeaderboardListProps) {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<TabKey>("weekly");
  const [prizesOpen, setPrizesOpen] = useState(false);
  const { showPodium, podiumRows, listRows } = useMemo(() => {
    const scored = rows.filter((r) => r.playState === "scored");
    const podium = scored.length >= 3 ? scored.slice(0, 3) : [];
    const podiumIds = new Set(podium.map((p) => p.userId));
    const rest = podium.length
      ? rows.filter((r) => !podiumIds.has(r.userId))
      : rows;
    return {
      showPodium: podium.length > 0,
      podiumRows: podium,
      // Keep table strictly ordered by rank — never splice sticky into the middle.
      listRows: [...rest].sort((a, b) => a.rank - b.rank),
    };
  }, [rows]);

  const sticky = currentUserRow;
  const youInList = Boolean(
    sticky && listRows.some((r) => r.userId === sticky.userId),
  );
  const youOnPodium = Boolean(
    sticky && podiumRows.some((r) => r.userId === sticky.userId),
  );
  const [youAnchor, setYouAnchor] = useState<HTMLElement | null>(null);
  const [youInView, setYouInView] = useState(true);
  const stickyId = sticky?.userId ?? null;

  const chase = useMemo(() => {
    if (!sticky || sticky.rank <= 0) return null;
    if (sticky.rank === 1) {
      return { kind: "lead" as const };
    }
    const above = rows.find((r) => r.rank === sticky.rank - 1);
    if (!above) return null;
    const gap = Math.max(0, above.weeklyXp - sticky.weeklyXp + 1);
    return {
      kind: "hunt" as const,
      gap,
      targetRank: above.rank,
    };
  }, [sticky, rows]);

  useEffect(() => {
    if (tab !== "weekly" || !stickyId || !youAnchor) {
      setYouInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setYouInView(entry.isIntersecting),
      {
        root: null,
        rootMargin: "-72px 0px -140px 0px",
        threshold: 0,
      },
    );
    io.observe(youAnchor);
    return () => io.disconnect();
  }, [tab, stickyId, youAnchor]);

  const showStickyYou = tab === "weekly" && Boolean(sticky) && !youInView;

  function selectTab(next: TabKey) {
    if (next === tab) return;
    haptic(HAPTIC.light);
    setTab(next);
  }

  return (
    <section className="relative flex flex-1 flex-col">
      <header className="sticky top-0 z-20 -mx-1 bg-background/90 pb-2.5 pt-2 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-primary">
              {t("leaderboard.eyebrow")}
            </p>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {tab === "weekly"
                ? t("leaderboard.title")
                : t("leaderboard.hofTitle")}
            </h1>
          </div>
          {tab === "weekly" && (
            <span className="shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 font-display text-[11px] font-bold text-amber-800 ring-1 ring-amber-400/35 dark:text-amber-200">
              ⏳{" "}
              {t("leaderboard.resetsIn", {
                n: toLocaleDigits(resetsInDays, locale),
              })}
            </span>
          )}
        </div>

        <div
          role="tablist"
          aria-label={t("leaderboard.eyebrow")}
          className="mt-2.5 grid grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1"
        >
          {(
            [
              { key: "weekly" as const, label: t("leaderboard.tabWeekly") },
              { key: "hof" as const, label: t("leaderboard.tabHof") },
            ] as const
          ).map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(item.key)}
                className={[
                  "relative z-10 flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 font-display text-sm font-bold transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {active && (
                  <motion.span
                    layoutId="leaderboard-tab-pill"
                    className={[
                      "absolute inset-0 rounded-xl shadow-fantasy-sm",
                      item.key === "hof"
                        ? "border border-accent/40 bg-accent/15"
                        : "bg-surface",
                    ].join(" ")}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">
                  {item.key === "hof" ? "🏛️ " : "⚽ "}
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {tab === "hof" ? (
        <HallOfFamePanel weeks={hallOfFame} />
      ) : (
        <>
          {/* Chase card — your hunt */}
          {sticky && (
            <YourHuntCard
              you={sticky}
              chase={chase}
              onPrizes={() => {
                haptic(HAPTIC.tap);
                playSound("click");
                setPrizesOpen(true);
              }}
            />
          )}

          {!sticky && (
            <button
              type="button"
              onClick={() => {
                haptic(HAPTIC.tap);
                playSound("click");
                setPrizesOpen(true);
              }}
              className="mb-3 flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-start transition-transform active:scale-[0.99]"
            >
              <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-amber-900 dark:text-amber-100">
                <RankArt kind="trophy" size="sm" className="h-5 w-5" />
                {t("leaderboard.prizeBanner", {
                  n: toLocaleDigits(weeklyChampionCoins(), locale),
                })}
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("leaderboard.prizeTap")}
              </span>
            </button>
          )}

          {showPodium && (
            <div ref={youOnPodium ? setYouAnchor : undefined}>
              <LeaderboardPodium rows={podiumRows} />
            </div>
          )}

          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <p className="font-display text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              {t("leaderboard.tableTitle")}
            </p>
            <p className="font-display text-[11px] font-bold text-muted-foreground/80">
              {t("leaderboard.xpShort")}
            </p>
          </div>

          <motion.ol
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={[
              "flex flex-col gap-1.5",
              showStickyYou ? "pb-36" : "pb-28",
            ].join(" ")}
          >
            {listRows.map((row) => {
              const isYou = sticky?.userId === row.userId;
              return (
                <li
                  key={row.userId}
                  className="list-none"
                  ref={isYou && youInList ? setYouAnchor : undefined}
                >
                  <LeaderboardRowItem row={row} />
                </li>
              );
            })}
          </motion.ol>
        </>
      )}

      {showStickyYou && sticky && (
        <div className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-full max-w-mobile px-3 bottom-[calc(10.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="pointer-events-auto rounded-2xl border-2 border-primary bg-surface/95 p-0.5 shadow-fantasy-lg backdrop-blur-md">
            <LeaderboardRowItem row={sticky} sticky />
          </div>
        </div>
      )}

      <BottomSheet
        open={prizesOpen}
        onClose={() => setPrizesOpen(false)}
        title={t("leaderboard.prizeSheetTitle")}
        subtitle={t("leaderboard.prizeSheetSub")}
        closeLabel={t("common.close")}
      >
        <ul className="flex flex-col gap-2">
          {WEEKLY_PRIZE_TIERS.map((tier) => (
            <li
              key={tier.place}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2.5"
            >
              <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-foreground">
                <RankArt
                  kind={medalKindForPlace(tier.place)}
                  size="md"
                  className="h-6 w-6"
                />
                {t("leaderboard.prizePlace", {
                  n: toLocaleDigits(tier.place, locale),
                })}
              </span>
              <span className="flex flex-col items-end gap-0.5 font-display text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="coin" size="sm" />
                  {toLocaleDigits(tier.coins, locale)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
                  {toLocaleDigits(tier.xp, locale)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-body text-xs font-semibold text-muted-foreground">
          {t("leaderboard.prizeSheetHint")}
        </p>
      </BottomSheet>
    </section>
  );
}

function YourHuntCard({
  you,
  chase,
  onPrizes,
}: {
  you: LeaderboardRow;
  chase: { kind: "lead" } | { kind: "hunt"; gap: number; targetRank: number } | null;
  onPrizes: () => void;
}) {
  const { t, locale } = useTranslation();
  const tier = you.rank > 0 ? tierForRank(you.rank) : "climbing";
  const tierLabel =
    tier === "elite"
      ? t("leaderboard.tierElite")
      : tier === "contender"
        ? t("leaderboard.tierContender")
        : tier === "pack"
          ? t("leaderboard.tierPack")
          : t("leaderboard.tierClimbing");
  const tierTone =
    tier === "elite"
      ? "bg-amber-400/20 text-amber-900 ring-amber-400/40 dark:text-amber-100"
      : tier === "contender"
        ? "bg-emerald-400/15 text-emerald-800 ring-emerald-400/35 dark:text-emerald-200"
        : "bg-white/10 text-foreground/80 ring-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-3 overflow-hidden rounded-3xl border border-primary/30 bg-linear-to-br from-primary/15 via-surface to-secondary/10 p-3.5 shadow-fantasy-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">
            {t("leaderboard.yourHunt")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-display text-lg font-black text-foreground">
              {you.rank > 0
                ? t("leaderboard.rankLabel", {
                    n: toLocaleDigits(you.rank, locale),
                  })
                : t("leaderboard.unranked")}
            </span>
            <span
              className={[
                "rounded-full px-2 py-0.5 font-display text-[10px] font-bold ring-1",
                tierTone,
              ].join(" ")}
            >
              {tierLabel}
            </span>
          </div>
          <p className="mt-1 font-display text-xs font-semibold text-muted-foreground">
            {chase?.kind === "lead"
              ? t("leaderboard.gapLead")
              : chase?.kind === "hunt"
                ? t("leaderboard.gapNext", {
                    n: toLocaleDigits(chase.gap, locale),
                    rank: toLocaleDigits(chase.targetRank, locale),
                  })
                : t("leaderboard.rowMatches", {
                    n: toLocaleDigits(you.matchesPlayed, locale),
                  })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="inline-flex items-center gap-1 font-display text-xl font-black tabular-nums text-primary">
            <ResourceIcon kind="xp" size="sm" />
            {formatNumber(you.weeklyXp, locale)}
          </p>
          <button
            type="button"
            onClick={onPrizes}
            className="inline-flex min-h-8 items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 font-display text-[10px] font-bold text-amber-900 ring-1 ring-amber-400/40 dark:text-amber-100"
          >
            <RankArt kind="trophy" size="sm" className="h-3.5 w-3.5" />
            {t("leaderboard.prizeTap")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function LeaderboardRowItem({
  row,
  sticky,
}: {
  row: LeaderboardRow;
  sticky?: boolean;
}) {
  const { t, locale } = useTranslation();
  const unplayed = row.playState === "unplayed";
  const hot = !unplayed && row.rank > 0 && row.rank <= 10;

  return (
    <motion.div
      variants={sticky ? undefined : rowVariants}
      className={[
        "flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 shadow-fantasy-sm",
        sticky
          ? "border-transparent bg-primary/10"
          : row.isCurrentUser
            ? "border-primary/60 bg-primary/10"
            : unplayed
              ? "border-dashed border-border bg-muted/30 opacity-70"
              : hot
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-border/80 bg-surface",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display text-xs font-black",
          row.rank === 1
            ? "bg-amber-400/25 text-amber-800 dark:text-amber-200"
            : row.rank === 2
              ? "bg-slate-300/40 text-slate-700 dark:text-slate-200"
              : row.rank === 3
                ? "bg-orange-400/25 text-orange-800 dark:text-orange-200"
                : row.isCurrentUser
                  ? "bg-primary/25 text-primary"
                  : "bg-muted text-muted-foreground",
        ].join(" ")}
      >
        {unplayed || row.rank <= 0
          ? "—"
          : toLocaleDigits(row.rank, locale)}
      </div>

      <AvatarImage
        avatarKey={row.avatarKey}
        className={[
          "h-10 w-10 shrink-0 rounded-full ring-2",
          row.isCurrentUser ? "ring-primary/50" : "ring-transparent",
          unplayed ? "grayscale" : "",
        ].join(" ")}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-bold text-surface-foreground">
            {shortClubName(row.clubName, 22)}
          </p>
          {row.isCurrentUser && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 font-display text-[9px] font-extrabold uppercase text-primary-foreground">
              {t("leaderboard.you")}
            </span>
          )}
        </div>
        <p className="truncate font-body text-[11px] font-semibold text-muted-foreground">
          {unplayed
            ? t("leaderboard.notPlayed")
            : t("leaderboard.rowMatches", {
                n: toLocaleDigits(row.matchesPlayed, locale),
              })}
        </p>
      </div>

      <div className="shrink-0 rounded-xl bg-primary/10 px-2 py-1.5 text-end ring-1 ring-primary/15">
        <p
          className={[
            "inline-flex items-center gap-1 font-display text-sm font-extrabold tabular-nums leading-none",
            unplayed ? "text-muted-foreground" : "text-primary",
          ].join(" ")}
        >
          <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
          {formatNumber(row.weeklyXp, locale)}
        </p>
      </div>
    </motion.div>
  );
}
