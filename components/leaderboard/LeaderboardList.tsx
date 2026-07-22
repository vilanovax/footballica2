"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import type { LeaderboardRow } from "@/actions/getLeaderboard";
import type { HallOfFameWeek } from "@/actions/getHallOfFame";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatNumber, toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { HallOfFamePanel } from "./HallOfFamePanel";

type LeaderboardListProps = {
  rows: LeaderboardRow[];
  resetsInDays?: number;
  hallOfFame?: HallOfFameWeek[];
};

type TabKey = "weekly" | "hof";

// Podium styling for the top three — gold / silver / bronze.
const MEDALS: Record<number, { emoji: string; ring: string; bg: string }> = {
  1: {
    emoji: "🥇",
    ring: "border-[#e0a800]",
    bg: "bg-gradient-to-r from-[#fff3c4] to-[#ffe07a]",
  },
  2: {
    emoji: "🥈",
    ring: "border-[#9aa4ad]",
    bg: "bg-gradient-to-r from-[#f1f4f7] to-[#d3dae0]",
  },
  3: {
    emoji: "🥉",
    ring: "border-[#c08457]",
    bg: "bg-gradient-to-r from-[#f7e2d0] to-[#e6b78f]",
  },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
} as const;

export function LeaderboardList({
  rows,
  resetsInDays = 7,
  hallOfFame = [],
}: LeaderboardListProps) {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<TabKey>("weekly");
  const showPodium = rows.length >= 3;
  const podiumRows = showPodium ? rows.slice(0, 3) : [];
  const listRows = showPodium ? rows.slice(3) : rows;

  function selectTab(next: TabKey) {
    if (next === tab) return;
    haptic(HAPTIC.light);
    setTab(next);
  }

  return (
    <section className="flex flex-1 flex-col">
      {/* Sticky league header + Tehran week countdown */}
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
                        ? "border border-[#e0a800]/40 bg-[#fff8e1]"
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
          {showPodium && <LeaderboardPodium rows={podiumRows} />}

          <motion.ol
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2 pb-28 pt-1"
          >
            {listRows.map((row) => {
              const medal = MEDALS[row.rank];
              const isTop3 = Boolean(medal);

              return (
                <motion.li
                  key={row.userId}
                  variants={rowVariants}
                  className={[
                    "flex items-center gap-3 rounded-bubble p-3 shadow-fantasy transition-colors",
                    row.isCurrentUser
                      ? "border-4 border-primary bg-primary/10 ring-2 ring-primary/60 shadow-glow"
                      : medal
                        ? `border-2 ${medal.ring} ${medal.bg}`
                        : "border-2 border-border bg-surface",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold",
                      isTop3
                        ? "bg-black/10 text-black/80"
                        : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {medal ? (
                      <span aria-label={`#${row.rank}`}>{medal.emoji}</span>
                    ) : (
                      toLocaleDigits(row.rank, locale)
                    )}
                  </div>

                  <AvatarImage
                    avatarKey={row.avatarKey}
                    className="h-11 w-11 shrink-0 rounded-full"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={[
                          "truncate font-display text-base font-bold",
                          isTop3 ? "text-black/90" : "text-surface-foreground",
                        ].join(" ")}
                      >
                        {row.clubName}
                      </p>
                      {row.isCurrentUser && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-fantasy-sm">
                          <span aria-hidden>⭐</span> {t("leaderboard.you")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-end">
                    <p
                      className={[
                        "font-display text-lg font-extrabold leading-none",
                        isTop3 ? "text-black/90" : "text-primary",
                      ].join(" ")}
                    >
                      {formatNumber(row.weeklyXp, locale)}
                    </p>
                    <p
                      className={[
                        "text-[10px] font-bold uppercase tracking-widest",
                        isTop3 ? "text-black/50" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {t("result.xp")}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        </>
      )}
    </section>
  );
}
