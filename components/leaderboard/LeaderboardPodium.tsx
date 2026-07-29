"use client";

import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import type { LeaderboardRow } from "@/actions/getLeaderboard";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatNumber, toLocaleDigits } from "@/lib/i18n/format";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import { RankArt, medalKindForPlace } from "@/components/leaderboard/RankArt";

type LeaderboardPodiumProps = {
  rows: LeaderboardRow[];
};

const PLACES: Record<
  number,
  {
    ring: string;
    avatarBg: string;
    bar: string;
    barHeight: string;
    avatarSize: string;
  }
> = {
  1: {
    ring: "border-[#e0a800]",
    avatarBg: "bg-[#fff3c4]",
    bar: "bg-gradient-to-b from-[#ffe07a] to-[#e0a800]",
    barHeight: "h-24",
    avatarSize: "h-20 w-20 text-4xl",
  },
  2: {
    ring: "border-[#9aa4ad]",
    avatarBg: "bg-[#f1f4f7]",
    bar: "bg-gradient-to-b from-[#e6ecf1] to-[#9aa4ad]",
    barHeight: "h-16",
    avatarSize: "h-16 w-16 text-3xl",
  },
  3: {
    ring: "border-[#c08457]",
    avatarBg: "bg-[#f7e2d0]",
    bar: "bg-gradient-to-b from-[#f0d3bd] to-[#c08457]",
    barHeight: "h-12",
    avatarSize: "h-16 w-16 text-3xl",
  },
};

const RENDER_ORDER = [2, 1, 3] as const;

export function LeaderboardPodium({ rows }: LeaderboardPodiumProps) {
  const { locale } = useTranslation();
  const byRank = new Map(rows.map((r) => [r.rank, r] as const));

  return (
    <div className="mb-4 flex items-end justify-center gap-2 px-1 pt-8">
      {RENDER_ORDER.map((rank) => {
        const row = byRank.get(rank);
        if (!row) return null;
        const place = PLACES[rank];
        const isChampion = rank === 1;

        return (
          <motion.div
            key={row.userId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: rank === 1 ? 0.1 : rank === 2 ? 0.2 : 0.3,
            }}
            className="flex flex-1 flex-col items-center"
          >
            {isChampion && (
              <motion.div
                className="mb-0.5"
                animate={{ y: [0, -4, 0], rotate: [0, -6, 6, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.4,
                  ease: "easeInOut",
                }}
                aria-hidden
              >
                <RankArt kind="crown" size="lg" className="h-8 w-8" />
              </motion.div>
            )}

            <div className="relative">
              <motion.div
                className={[
                  "flex items-center justify-center rounded-full border-4 shadow-fantasy",
                  place.avatarBg,
                  place.ring,
                  place.avatarSize,
                  row.isCurrentUser ? "ring-4 ring-primary/70" : "",
                ].join(" ")}
                animate={isChampion ? { y: [0, -5, 0] } : undefined}
                transition={
                  isChampion
                    ? { repeat: Infinity, duration: 3, ease: "easeInOut" }
                    : undefined
                }
              >
                <AvatarImage
                  avatarKey={row.avatarKey}
                  className="h-full w-full rounded-full"
                />
              </motion.div>
              <span
                className="absolute -bottom-1.5 flex h-7 w-7 items-center justify-center inset-inline-end-[-2px]"
                aria-label={`#${rank}`}
              >
                <RankArt
                  kind={medalKindForPlace(rank)}
                  size="md"
                  className="h-7 w-7"
                />
              </span>
            </div>

            <p className="mt-2 w-full truncate text-center font-display text-xs font-bold text-foreground">
              {row.clubName}
            </p>
            <p className="inline-flex items-center gap-1 font-display text-sm font-extrabold leading-none text-primary">
              <ResourceIcon kind="xp" size="sm" className="h-4 w-4" />
              {formatNumber(row.weeklyXp, locale)}
            </p>

            <div
              className={[
                "mt-2 flex w-full items-start justify-center rounded-t-bubble pt-2 font-display text-2xl font-black text-black/70 shadow-fantasy",
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
  );
}
