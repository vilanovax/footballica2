"use client";

import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import type { LeaderboardRow } from "@/actions/getLeaderboard";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatNumber, toLocaleDigits } from "@/lib/i18n/format";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import { RankArt, medalKindForPlace } from "@/components/leaderboard/RankArt";
import { shortClubName } from "@/lib/leaderboard/displayName";

type LeaderboardPodiumProps = {
  rows: LeaderboardRow[];
};

const PLACES: Record<
  number,
  {
    ring: string;
    glow: string;
    bar: string;
    barHeight: string;
    avatarSize: string;
  }
> = {
  1: {
    ring: "ring-[#e0a800]",
    glow: "shadow-[0_0_28px_rgba(224,168,0,0.45)]",
    bar: "bg-linear-to-b from-[#ffe07a] to-[#e0a800]",
    barHeight: "h-20",
    avatarSize: "h-[4.5rem] w-[4.5rem]",
  },
  2: {
    ring: "ring-[#9aa4ad]",
    glow: "shadow-[0_0_18px_rgba(154,164,173,0.35)]",
    bar: "bg-linear-to-b from-[#e6ecf1] to-[#9aa4ad]",
    barHeight: "h-14",
    avatarSize: "h-14 w-14",
  },
  3: {
    ring: "ring-[#c08457]",
    glow: "shadow-[0_0_18px_rgba(192,132,87,0.35)]",
    bar: "bg-linear-to-b from-[#f0d3bd] to-[#c08457]",
    barHeight: "h-11",
    avatarSize: "h-14 w-14",
  },
};

const RENDER_ORDER = [2, 1, 3] as const;

export function LeaderboardPodium({ rows }: LeaderboardPodiumProps) {
  const { t, locale } = useTranslation();
  const byRank = new Map(rows.map((r) => [r.rank, r] as const));

  return (
    <div className="relative mb-3 overflow-hidden rounded-3xl border border-white/10 bg-[#121820] px-2 pb-1 pt-3 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-amber-400/12 via-transparent to-emerald-500/10"
      />
      <p className="relative mb-2 text-center font-display text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-200/70">
        {t("leaderboard.podiumTitle")}
      </p>

      <div className="relative flex items-end justify-center gap-1.5 px-0.5 pt-6">
        {RENDER_ORDER.map((rank) => {
          const row = byRank.get(rank);
          if (!row) return null;
          const place = PLACES[rank]!;
          const isChampion = rank === 1;

          return (
            <motion.div
              key={row.userId}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 20,
                delay: rank === 1 ? 0.08 : rank === 2 ? 0.16 : 0.24,
              }}
              className="flex flex-1 flex-col items-center"
            >
              {isChampion && (
                <motion.div
                  className="mb-0.5"
                  animate={{ y: [0, -3, 0], rotate: [0, -5, 5, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.4,
                    ease: "easeInOut",
                  }}
                  aria-hidden
                >
                  <RankArt kind="crown" size="md" className="h-7 w-7" />
                </motion.div>
              )}

              <div className="relative">
                <div
                  className={[
                    "overflow-hidden rounded-full ring-4",
                    place.ring,
                    place.glow,
                    place.avatarSize,
                    row.isCurrentUser ? "outline outline-2 outline-offset-2 outline-primary" : "",
                  ].join(" ")}
                >
                  <AvatarImage
                    avatarKey={row.avatarKey}
                    className="h-full w-full rounded-full"
                  />
                </div>
                <span
                  className="absolute -bottom-1 flex h-6 w-6 items-center justify-center inset-inline-end-[-2px]"
                  aria-label={`#${rank}`}
                >
                  <RankArt
                    kind={medalKindForPlace(rank)}
                    size="sm"
                    className="h-6 w-6"
                  />
                </span>
              </div>

              <p className="mt-2 w-full truncate text-center font-display text-[11px] font-bold text-white">
                {shortClubName(row.clubName, isChampion ? 16 : 12)}
              </p>
              <p className="inline-flex items-center gap-0.5 font-display text-xs font-extrabold tabular-nums text-emerald-300">
                <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
                {formatNumber(row.weeklyXp, locale)}
              </p>

              <div
                className={[
                  "mt-1.5 flex w-full items-start justify-center rounded-t-2xl pt-1.5 font-display text-xl font-black text-black/65",
                  place.bar,
                  place.barHeight,
                ].join(" ")}
              >
                {toLocaleDigits(rank, locale)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
