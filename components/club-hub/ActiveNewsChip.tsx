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

/** Live Newspaper Event timer — taps reopen today's edition. */
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
        "flex w-full min-h-touch items-center justify-between gap-2 rounded-bubble border px-3 py-2 shadow-fantasy-sm",
        isCoin
          ? "border-accent/40 bg-accent/15"
          : "border-secondary/40 bg-secondary/15",
      ].join(" ")}
    >
      <span className="flex items-center gap-2 font-display text-sm font-bold">
        <span aria-hidden>{emoji}</span>
        <span className={isCoin ? "text-accent-deep" : "text-secondary"}>
          {t(labelKey, { mult: formatMultiplier(booster.multiplier) })}
        </span>
      </span>
      <span className="font-display text-xs font-bold tabular-nums text-muted-foreground">
        {toLocaleDigits(formatRemaining(remainingMs), locale)}
      </span>
    </motion.button>
  );
}
