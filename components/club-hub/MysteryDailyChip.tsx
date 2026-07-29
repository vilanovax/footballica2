"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
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
        className="flex items-center gap-2.5 rounded-2xl bg-linear-to-r from-amber-500/20 via-surface to-primary/15 px-3 py-2.5 shadow-fantasy-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/mystery.png"
          alt=""
          aria-hidden
          draggable={false}
          className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
        />
        <div className="min-w-0 flex-1 text-start">
          <p className="font-display text-sm font-black text-foreground">
            {t("play.mysteryTitle")}
          </p>
          <p className="mt-0.5 font-display text-[11px] font-bold leading-snug text-foreground/70">
            {mysteryStreak > 0
              ? t("mystery.streak", {
                  n: toLocaleDigits(mysteryStreak, locale),
                })
              : t("club.mysteryChipIdle")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 font-display text-xs font-extrabold text-primary-foreground shadow-fantasy-sm">
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          {t("play.mysteryCta")}
        </span>
      </Link>
    </motion.div>
  );
}
