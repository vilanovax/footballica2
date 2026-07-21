"use client";

import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import type { LeaderboardRow } from "@/actions/getLeaderboard";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatNumber, toLocaleDigits } from "@/lib/i18n/format";

type LeaderboardPodiumProps = {
  rows: LeaderboardRow[];
};

// Per-place theming: medal, avatar ring/fill, pedestal gradient + height.
const PLACES: Record<
  number,
  {
    medal: string;
    ring: string;
    avatarBg: string;
    bar: string;
    barHeight: string;
    avatarSize: string;
  }
> = {
  1: {
    medal: "🥇",
    ring: "border-[#e0a800]",
    avatarBg: "bg-[#fff3c4]",
    bar: "bg-gradient-to-b from-[#ffe07a] to-[#e0a800]",
    barHeight: "h-24",
    avatarSize: "h-20 w-20 text-4xl",
  },
  2: {
    medal: "🥈",
    ring: "border-[#9aa4ad]",
    avatarBg: "bg-[#f1f4f7]",
    bar: "bg-gradient-to-b from-[#e6ecf1] to-[#9aa4ad]",
    barHeight: "h-16",
    avatarSize: "h-16 w-16 text-3xl",
  },
  3: {
    medal: "🥉",
    ring: "border-[#c08457]",
    avatarBg: "bg-[#f7e2d0]",
    bar: "bg-gradient-to-b from-[#f0d3bd] to-[#c08457]",
    barHeight: "h-12",
    avatarSize: "h-16 w-16 text-3xl",
  },
};

// Render order places the winner in the middle regardless of text direction.
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
              <motion.span
                className="mb-0.5 text-2xl"
                animate={{ y: [0, -4, 0], rotate: [0, -6, 6, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                aria-hidden
              >
                👑
              </motion.span>
            )}

            {/* Avatar medallion */}
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
                className="absolute -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-sm shadow-fantasy-sm inset-inline-end-0"
                aria-label={`#${rank}`}
              >
                {place.medal}
              </span>
            </div>

            {/* Name + XP */}
            <p className="mt-2 w-full truncate text-center font-display text-xs font-bold text-foreground">
              {row.clubName}
            </p>
            <p className="font-display text-sm font-extrabold leading-none text-primary">
              {formatNumber(row.weeklyXp, locale)}
            </p>

            {/* Pedestal */}
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
