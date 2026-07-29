"use client";

import { useEffect, useState } from "react";
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

type LeaderboardListProps = {
  rows: LeaderboardRow[];
  resetsInDays?: number;
  hallOfFame?: HallOfFameWeek[];
  currentUserRow?: LeaderboardRow | null;
};

type TabKey = "weekly" | "hof";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
} as const;

export function LeaderboardList({
  rows,
  resetsInDays = 7,
  hallOfFame = [],
  currentUserRow = null,
}: LeaderboardListProps) {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<TabKey>("weekly");
  const [prizesOpen, setPrizesOpen] = useState(false);
  const showPodium = rows.filter((r) => r.playState === "scored").length >= 3;
  const podiumRows = showPodium
    ? rows.filter((r) => r.playState === "scored").slice(0, 3)
    : [];
  const listRows = showPodium
    ? rows.filter(
        (r) => !podiumRows.some((p) => p.userId === r.userId),
      )
    : rows;

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

  // Sticky "you" bar only when the in-page row/podium card is off-screen.
  useEffect(() => {
    if (tab !== "weekly" || !stickyId || !youAnchor) {
      setYouInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setYouInView(entry.isIntersecting),
      {
        root: null,
        // Account for sticky header + bottom nav chrome.
        rootMargin: "-72px 0px -140px 0px",
        threshold: 0,
      },
    );
    io.observe(youAnchor);
    return () => io.disconnect();
  }, [tab, stickyId, youAnchor]);

  const showStickyYou =
    tab === "weekly" && Boolean(sticky) && !youInView;

  function selectTab(next: TabKey) {
    if (next === tab) return;
    haptic(HAPTIC.light);
    setTab(next);
  }

  return (
    <section className="relative flex flex-1 flex-col">
      <header className="sticky top-0 z-20 -mx-1 bg-background/90 pb-3 pt-2 backdrop-blur-md">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          {t("leaderboard.eyebrow")}
        </p>
        <div className="flex items-end justify-between gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {tab === "weekly"
              ? t("leaderboard.title")
              : t("leaderboard.hofTitle")}
          </h1>
          {tab === "weekly" && (
            <span className="rounded-full bg-surface px-3 py-1 font-display text-xs font-bold text-accent-deep shadow-fantasy-sm">
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
          className="mt-3 grid grid-cols-2 gap-1 rounded-bubble-lg bg-muted/70 p-1"
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
                  "relative z-10 flex min-h-10 items-center justify-center gap-1.5 rounded-bubble px-2 font-display text-sm font-bold transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {active && (
                  <motion.span
                    layoutId="leaderboard-tab-pill"
                    className={[
                      "absolute inset-0 rounded-bubble shadow-fantasy-sm",
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
          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.tap);
              playSound("click");
              setPrizesOpen(true);
            }}
            className="mb-3 flex w-full items-center justify-between gap-2 rounded-bubble border border-accent/40 bg-accent/10 px-3 py-2 text-start shadow-fantasy-sm transition-transform active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-accent-deep">
              <RankArt kind="trophy" size="sm" className="h-5 w-5" />
              <span>
                {t("leaderboard.prizeBanner", {
                  n: toLocaleDigits(weeklyChampionCoins(), locale),
                })}
              </span>
            </span>
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("leaderboard.prizeTap")}
            </span>
          </button>

          {showPodium && (
            <div
              ref={youOnPodium ? setYouAnchor : undefined}
            >
              <LeaderboardPodium rows={podiumRows} />
            </div>
          )}

          <motion.ol
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={[
              "flex flex-col gap-1.5 pt-1",
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
                  <LeaderboardRowItem row={row} compact />
                </li>
              );
            })}
          </motion.ol>
        </>
      )}

      {showStickyYou && sticky && (
        <div className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-full max-w-mobile px-3 bottom-[calc(10.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="pointer-events-auto rounded-bubble-lg border-2 border-primary bg-surface/95 p-0.5 shadow-fantasy-lg backdrop-blur-md">
            <LeaderboardRowItem row={sticky} compact sticky />
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
              className="flex items-center justify-between gap-3 rounded-bubble border border-border bg-muted/40 px-3 py-2.5"
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

function LeaderboardRowItem({
  row,
  compact,
  sticky,
}: {
  row: LeaderboardRow;
  compact?: boolean;
  sticky?: boolean;
}) {
  const { t, locale } = useTranslation();
  const unplayed = row.playState === "unplayed";

  return (
    <motion.div
      variants={sticky ? undefined : rowVariants}
      className={[
        "flex items-center gap-2.5 rounded-bubble border shadow-fantasy-sm",
        compact ? "px-2.5 py-2" : "p-3",
        sticky
          ? "border-transparent bg-primary/10"
          : row.isCurrentUser
            ? "border-primary bg-primary/10"
            : unplayed
              ? "border-dashed border-border bg-muted/30 opacity-70"
              : "border-border bg-surface",
      ].join(" ")}
    >
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-full bg-muted font-display font-extrabold text-muted-foreground",
          compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-base",
        ].join(" ")}
      >
        {unplayed ? "—" : toLocaleDigits(row.rank, locale)}
      </div>

      <AvatarImage
        avatarKey={row.avatarKey}
        className={[
          "shrink-0 rounded-full",
          compact ? "h-9 w-9" : "h-11 w-11",
          unplayed ? "grayscale" : "",
        ].join(" ")}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-bold text-surface-foreground">
            {row.clubName}
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

      <div className="shrink-0 text-end">
        <p
          className={[
            "inline-flex items-center gap-1 font-display font-extrabold leading-none",
            compact ? "text-base" : "text-lg",
            unplayed ? "text-muted-foreground" : "text-primary",
          ].join(" ")}
        >
          <ResourceIcon kind="xp" size="sm" className="h-4 w-4" />
          {formatNumber(row.weeklyXp, locale)}
        </p>
      </div>
    </motion.div>
  );
}
