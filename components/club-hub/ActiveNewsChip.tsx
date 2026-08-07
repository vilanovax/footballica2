"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BOOSTER_DURATION_HOURS,
  formatMultiplier,
  newspaperEventById,
} from "@/lib/boosters/boosters";
import type { ActiveNewsBoosterSnapshot } from "@/lib/club/upgrades";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type ActiveNewsChipProps = {
  booster: ActiveNewsBoosterSnapshot;
  onExpired?: () => void;
  onOpen?: () => void;
  /** Slim club-chrome strip for the post-stadium Today rail. */
  compact?: boolean;
};

const BOOSTER_DURATION_MS = BOOSTER_DURATION_HOURS * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Live Newspaper Event timer — cooldown-style booster HUD chip. */
export function ActiveNewsChip({
  booster,
  onExpired,
  onOpen,
  compact = false,
}: ActiveNewsChipProps) {
  const { t, locale } = useTranslation();
  const expiresAt = new Date(booster.expiresAt).getTime();
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, expiresAt - Date.now()),
  );

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, expiresAt - Date.now());
      setRemainingMs(ms);
      if (ms <= 0) onExpired?.();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpired]);

  if (remainingMs <= 0) return null;

  const catalog = newspaperEventById(booster.headline);
  const isCoin = booster.type === "COIN_BOOST";
  const labelKey = isCoin ? "news.activeChipCoin" : "news.activeChipFan";
  const remainPct = Math.min(
    100,
    Math.round((remainingMs / BOOSTER_DURATION_MS) * 100),
  );
  const urgent = remainingMs < 5 * 60_000;
  const eventTitle = catalog
    ? t(`news.events.${catalog.id}`)
    : booster.headline;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      aria-label={t("club.dailyNews")}
      className={[
        "relative flex w-full flex-col overflow-hidden border-2 shadow-[0_3px_0_0_rgba(0,0,0,0.28)]",
        compact
          ? "min-h-11 rounded-2xl border-white/15"
          : "min-h-12 rounded-bubble-xl border-[3px]",
        !compact && isCoin
          ? "border-amber-300/55"
          : !compact
            ? "border-sky-300/50"
            : "",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 bg-linear-to-br",
          compact
            ? "from-[#0f172a] via-[#14532d]/85 to-[#052e16]"
            : isCoin
              ? "from-[#5c3d0a] via-[#9a6b12] to-[#2a1c06]"
              : "from-[#0c2d4a] via-[#134e75] to-[#081f33]",
        ].join(" ")}
        aria-hidden
      />

      <div
        className={[
          "relative flex items-center justify-between gap-2",
          compact ? "px-2.5 py-2" : "px-3 py-2.5",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-2 font-display font-black text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isCoin ? "/icons/coin.png" : "/icons/fans.png"}
            alt=""
            draggable={false}
            className={
              compact ? "h-5 w-5 object-contain" : "h-6 w-6 object-contain"
            }
          />
          <span
            className={[
              "min-w-0 truncate",
              compact ? "text-xs" : "text-sm",
            ].join(" ")}
          >
            {t(labelKey, { mult: formatMultiplier(booster.multiplier) })}
            {!compact && (
              <span className="mt-0.5 block truncate font-display text-[10px] font-bold text-white/55">
                {eventTitle}
              </span>
            )}
          </span>
        </span>
        <span
          className={[
            "shrink-0 rounded-bubble font-display font-black tabular-nums ring-1",
            compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs",
            urgent
              ? "bg-rose-500/30 text-rose-100 ring-rose-300/40"
              : "bg-black/40 text-white/95 ring-white/20",
          ].join(" ")}
        >
          {toLocaleDigits(formatRemaining(remainingMs), locale)}
        </span>
      </div>

      <div className="relative h-1 bg-black/45" aria-hidden>
        <motion.div
          className={[
            "h-full",
            urgent
              ? "bg-linear-to-r from-rose-400 to-orange-300"
              : "bg-linear-to-r from-emerald-400 to-lime-300",
          ].join(" ")}
          initial={false}
          animate={{ width: `${remainPct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </motion.button>
  );
}
