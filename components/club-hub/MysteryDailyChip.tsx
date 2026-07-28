"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  mysteryStreak: number;
};

/** Hub shortcut to Game of the Day — shows mystery streak when live. */
export function MysteryDailyChip({ mysteryStreak }: Props) {
  const { t, locale } = useTranslation();

  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Link
        href="/play/mystery"
        onClick={() => playSound("click")}
        className="flex items-center gap-2.5 rounded-2xl border border-amber-400/35 bg-linear-to-r from-amber-500/15 to-primary/10 px-3 py-2.5 shadow-fantasy-sm"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-lg"
          aria-hidden
        >
          🕵️
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">
            {t("play.mysteryTitle")}
          </p>
          <p className="font-display text-[11px] font-bold text-amber-800 dark:text-amber-200">
            {mysteryStreak > 0
              ? t("mystery.streak", {
                  n: toLocaleDigits(mysteryStreak, locale),
                })
              : t("club.mysteryChipIdle")}
          </p>
        </div>
        <span className="font-display text-xs font-extrabold text-primary">
          {t("play.mysteryCta")} →
        </span>
      </Link>
    </motion.div>
  );
}
