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
import {
  GameChip,
  GamePanel,
} from "@/components/ui/game";
import { cn } from "@/lib/utils";

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
      <header className="sticky top-0 z-20 -mx-1 bg-background/85 pb-2.5 pt-2 backdrop-blur-md">
        <GamePanel tone="emerald" className="p-3">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full bg-emerald-300/25 blur-2xl"
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 2.6, repeat: Infinity }}
          />

          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-[10px] font-black uppercase tracking-widest text-emerald-200/75">
                {t("leaderboard.eyebrow")}
              </p>
              <h1 className="mt-0.5 font-display text-2xl font-black text-white drop-shadow-sm">
                {tab === "weekly"
                  ? t("leaderboard.title")
                  : t("leaderboard.hofTitle")}
              </h1>
            </div>
            {tab === "weekly" && (
              <GameChip tone="amber" className="shrink-0 gap-1 px-2.5 py-1.5 text-[11px]">
                ⏳{" "}
                {t("leaderboard.resetsIn", {
                  n: toLocaleDigits(resetsInDays, locale),
                })}
              </GameChip>
            )}
          </div>

          <div
            role="tablist"
            aria-label={t("leaderboard.eyebrow")}
            className="relative mt-3 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/12 bg-black/30 p-1"
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
                    "relative z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 font-display text-sm font-black transition-colors",
                    active ? "text-emerald-950" : "text-white/65",
                  ].join(" ")}
                >
                  {active && (
                    <motion.span
                      layoutId="leaderboard-tab-pill"
                      className="absolute inset-0 rounded-xl bg-accent shadow-[0_3px_0_0_rgba(0,0,0,0.3)]"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
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
        </GamePanel>
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
              className="mb-3 w-full text-start transition-transform active:scale-[0.99]"
            >
              <GamePanel
                tone="amber"
                className="flex w-full items-center justify-between gap-2 px-3 py-3"
              >
              <span className="relative inline-flex items-center gap-1.5 font-display text-xs font-black text-amber-50">
                <RankArt kind="trophy" size="sm" className="h-5 w-5" />
                {t("leaderboard.prizeBanner", {
                  n: toLocaleDigits(weeklyChampionCoins(), locale),
                })}
              </span>
              <span className="relative rounded-bubble bg-accent px-2.5 py-1 font-display text-[10px] font-black text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.3)]">
                {t("leaderboard.prizeTap")}
              </span>
              </GamePanel>
            </button>
          )}

          <div className="relative mb-1 overflow-hidden rounded-bubble-xl bg-linear-to-b from-[#052e16]/40 via-transparent to-transparent p-0.5">
            {showPodium && (
              <div ref={youOnPodium ? setYouAnchor : undefined}>
                <LeaderboardPodium rows={podiumRows} />
              </div>
            )}

            <div className="mb-1.5 flex items-center justify-between px-1">
              <p className="font-display text-[10px] font-black uppercase tracking-widest text-emerald-800/70">
                {t("leaderboard.tableTitle")}
              </p>
              <p className="font-display text-[10px] font-black text-emerald-800/55">
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
          </div>
        </>
      )}

      {showStickyYou && sticky && (
        <div className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-full max-w-mobile px-3 bottom-[calc(10.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="pointer-events-auto ring-2 ring-arena-amber shadow-[0_0_20px_rgba(251,191,36,0.35)]">
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
        tone="dark"
      >
        <ul className="flex flex-col gap-2">
          {WEEKLY_PRIZE_TIERS.map((tier) => (
            <li
              key={tier.place}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-white/12 bg-black/30 px-3 py-2.5 shadow-[0_3px_0_0_rgba(0,0,0,0.3)]"
            >
              <span className="inline-flex items-center gap-2 font-display text-sm font-black text-white">
                <RankArt
                  kind={medalKindForPlace(tier.place)}
                  size="md"
                  className="h-6 w-6"
                />
                {t("leaderboard.prizePlace", {
                  n: toLocaleDigits(tier.place, locale),
                })}
              </span>
              <span className="flex flex-col items-end gap-0.5 font-display text-xs font-black text-white/70">
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="coin" size="sm" />
                  {toLocaleDigits(tier.coins, locale)}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
                  {toLocaleDigits(tier.xp, locale)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-display text-xs font-bold text-white/50">
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
      ? "bg-amber-400/30 text-amber-100 ring-amber-300/50"
      : tier === "contender"
        ? "bg-emerald-400/25 text-emerald-100 ring-emerald-300/45"
        : "bg-white/10 text-white/80 ring-white/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3"
    >
      <GamePanel tone="emerald" className="p-3">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full bg-emerald-300/30 blur-2xl"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />

      <div className="relative flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] font-black uppercase tracking-widest text-emerald-200/75">
            {t("leaderboard.yourHunt")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-display text-lg font-black text-white drop-shadow-sm">
              {you.rank > 0
                ? t("leaderboard.rankLabel", {
                    n: toLocaleDigits(you.rank, locale),
                  })
                : t("leaderboard.unranked")}
            </span>
            <span
              className={[
                "rounded-full px-2 py-0.5 font-display text-[10px] font-black ring-1",
                tierTone,
              ].join(" ")}
            >
              {tierLabel}
            </span>
          </div>
          <p className="mt-1 font-display text-[11px] font-bold text-white/65">
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

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 font-display text-xl font-black tabular-nums text-emerald-200">
            <ResourceIcon kind="xp" size="sm" />
            {formatNumber(you.weeklyXp, locale)}
          </p>
          <button
            type="button"
            onClick={onPrizes}
            className="game-cta game-cta-accent inline-flex min-h-9 items-center gap-1 px-2.5 py-1.5 font-display text-[11px] font-black"
          >
            <RankArt kind="trophy" size="sm" className="h-3.5 w-3.5" />
            {t("leaderboard.prizeTap")}
          </button>
        </div>
      </div>
      </GamePanel>
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
  const you = row.isCurrentUser;
  const tone =
    sticky || you || hot ? "emerald" : unplayed ? "sky" : "emerald";

  return (
    <motion.div variants={sticky ? undefined : rowVariants}>
      <GamePanel
        tone={tone as "emerald" | "sky"}
        className={cn(
          "flex min-h-12 items-center gap-2 px-2 py-1.5",
          (sticky || you) &&
            "ring-2 ring-arena-amber shadow-[0_0_18px_rgba(251,191,36,0.28)]",
          unplayed && "opacity-75",
          !hot && !you && !sticky && !unplayed && "game-panel opacity-95",
        )}
      >
      {(sticky || you) && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_0%_50%,rgba(251,191,36,0.18),transparent_55%)]"
        />
      )}

      <div
        className={[
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-black tabular-nums",
          you
            ? "bg-accent text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.35)]"
            : unplayed
              ? "bg-black/30 text-white/45"
              : hot
                ? "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-300/35"
                : "bg-black/40 text-white/85 ring-1 ring-white/12",
        ].join(" ")}
      >
        {unplayed || row.rank <= 0
          ? "—"
          : toLocaleDigits(row.rank, locale)}
      </div>

      <AvatarImage
        avatarKey={row.avatarKey}
        className={[
          "relative h-9 w-9 shrink-0 rounded-full ring-2",
          you ? "ring-accent/80" : "ring-white/20",
          unplayed ? "grayscale" : "",
        ].join(" ")}
      />

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className="truncate font-display text-[13px] font-black leading-tight text-white"
            title={row.clubName}
          >
            {shortClubName(row.clubName, 20)}
          </p>
          {you && (
            <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 font-display text-[9px] font-extrabold uppercase text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.3)]">
              {t("leaderboard.you")}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-display text-[10px] font-bold leading-none text-white/45">
          {unplayed
            ? t("leaderboard.notPlayed")
            : t("leaderboard.rowMatches", {
                n: toLocaleDigits(row.matchesPlayed, locale),
              })}
        </p>
      </div>

      <div
        className={[
          "relative shrink-0 rounded-xl px-2 py-1 text-end",
          you
            ? "bg-black/40 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]"
            : "bg-black/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
        ].join(" ")}
      >
        <p
          className={[
            "inline-flex items-center gap-1 font-display text-sm font-black tabular-nums leading-none",
            unplayed ? "text-white/45" : "text-emerald-300",
          ].join(" ")}
        >
          {formatNumber(row.weeklyXp, locale)}
          <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
        </p>
      </div>
      </GamePanel>
    </motion.div>
  );
}
