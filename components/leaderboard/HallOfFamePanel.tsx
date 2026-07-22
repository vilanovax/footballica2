"use client";

import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import type { HallOfFameWeek } from "@/actions/getHallOfFame";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatNumber, toLocaleDigits } from "@/lib/i18n/format";

type HallOfFamePanelProps = {
  weeks: HallOfFameWeek[];
};

const RANK_STYLE: Record<
  number,
  { emoji: string; ring: string; glow: string }
> = {
  1: {
    emoji: "👑",
    ring: "border-[#e0a800]",
    glow: "bg-gradient-to-r from-[#fff8e1] via-[#ffe082] to-[#ffca28] shadow-[0_0_20px_rgba(224,168,0,0.35)]",
  },
  2: {
    emoji: "🥈",
    ring: "border-[#9aa4ad]",
    glow: "bg-gradient-to-r from-[#f8fafc] to-[#e2e8f0]",
  },
  3: {
    emoji: "🥉",
    ring: "border-[#c08457]",
    glow: "bg-gradient-to-r from-[#fdf4ed] to-[#f0d5b8]",
  },
};

/** Format `2026-W30` → localized week label. */
function weekLabel(
  key: string,
  locale: string,
  t: (k: string, p?: Record<string, string | number>) => string,
): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return key;
  const year = m[1];
  const week = toLocaleDigits(Number(m[2]), locale as "en" | "fa");
  return t("leaderboard.hofWeek", { week, year });
}

/**
 * Past weekly podiums — golden treatment for champions of history.
 */
export function HallOfFamePanel({ weeks }: HallOfFamePanelProps) {
  const { t, locale } = useTranslation();

  if (weeks.length === 0) {
    return (
      <div className="mt-4 rounded-bubble-xl border-2 border-dashed border-[#e0a800]/50 bg-[#fff8e1]/40 px-4 py-10 text-center">
        <p className="text-3xl" aria-hidden>
          🏆
        </p>
        <p className="mt-2 font-display text-base font-bold text-foreground">
          {t("leaderboard.hofEmpty")}
        </p>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          {t("leaderboard.hofEmptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28 pt-2">
      {weeks.map((week, wi) => (
        <motion.section
          key={week.tehranWeekKey}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: wi * 0.05 }}
          className="overflow-hidden rounded-bubble-xl border-2 border-[#e0a800]/40 bg-surface shadow-fantasy"
        >
          <header className="flex items-center gap-2 border-b border-[#e0a800]/25 bg-gradient-to-r from-[#fff8e1] to-transparent px-4 py-2.5">
            <span aria-hidden className="text-lg">
              🏛️
            </span>
            <h2 className="font-display text-sm font-black tracking-wide text-[#8a6a00]">
              {weekLabel(week.tehranWeekKey, locale, t)}
            </h2>
          </header>

          <ol className="flex flex-col gap-2 p-3">
            {week.entries.map((entry) => {
              const style = RANK_STYLE[entry.rank] ?? RANK_STYLE[3];
              return (
                <li
                  key={entry.id}
                  className={[
                    "flex items-center gap-3 rounded-bubble border-2 p-3",
                    style.ring,
                    style.glow,
                    entry.isCurrentUser ? "ring-2 ring-primary/50" : "",
                  ].join(" ")}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/10 text-xl"
                    aria-label={`#${entry.rank}`}
                  >
                    {style.emoji}
                  </span>
                  <AvatarImage
                    avatarKey={entry.avatarKey}
                    className="h-11 w-11 shrink-0 rounded-full ring-2 ring-white/80"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold text-black/90">
                      {entry.clubName}
                    </p>
                    {entry.isCurrentUser && (
                      <span className="mt-0.5 inline-flex rounded-full bg-primary px-2 py-0.5 font-display text-[10px] font-extrabold text-primary-foreground">
                        {t("leaderboard.you")}
                      </span>
                    )}
                    {entry.rank === 1 && (
                      <p className="mt-0.5 font-display text-[11px] font-bold text-[#8a6a00]">
                        {t("leaderboard.champion")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-display text-lg font-extrabold leading-none text-black/90">
                      {formatNumber(entry.xp, locale)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/45">
                      {t("result.xp")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </motion.section>
      ))}
    </div>
  );
}
