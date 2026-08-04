"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
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
};

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

/** Live Newspaper Event timer — dark game chip matching Club Business chrome. */
export function ActiveNewsChip({
  booster,
  onExpired,
  onOpen,
}: ActiveNewsChipProps) {
  const { t, locale } = useTranslation();
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(booster.expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(
        0,
        new Date(booster.expiresAt).getTime() - Date.now(),
      );
      setRemainingMs(ms);
      if (ms <= 0) onExpired?.();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [booster.expiresAt, onExpired]);

  if (remainingMs <= 0) return null;

  const catalog = newspaperEventById(booster.headline);
  const emoji = catalog?.emoji ?? "📰";
  const isCoin = booster.type === "COIN_BOOST";
  const labelKey = isCoin ? "news.activeChipCoin" : "news.activeChipFan";

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
        "relative flex w-full min-h-12 items-center justify-between gap-2 overflow-hidden rounded-bubble-xl border-[3px] px-3 py-2.5 shadow-[0_4px_0_0_rgba(0,0,0,0.28)]",
        isCoin ? "border-amber-300/50" : "border-sky-300/45",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 bg-linear-to-br",
          isCoin
            ? "from-[#5c3d0a] via-[#9a6b12] to-[#2a1c06]"
            : "from-[#0c2d4a] via-[#134e75] to-[#081f33]",
        ].join(" ")}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
        }}
        aria-hidden
      />

      <span className="relative flex min-w-0 items-center gap-2 font-display text-sm font-black text-white">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-lg"
          aria-hidden
        >
          {emoji}
        </span>
        <span className="truncate">
          {t(labelKey, { mult: formatMultiplier(booster.multiplier) })}
        </span>
      </span>
      <span className="relative shrink-0 rounded-bubble bg-black/35 px-2.5 py-1 font-display text-xs font-black tabular-nums text-white/90 ring-1 ring-white/15">
        {toLocaleDigits(formatRemaining(remainingMs), locale)}
      </span>
    </motion.button>
  );
}
