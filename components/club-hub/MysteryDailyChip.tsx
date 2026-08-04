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

/** Hub shortcut to Game of the Day — dark game row matching Club Business chrome. */
export function MysteryDailyChip({ mysteryStreak }: Props) {
  const { t, locale } = useTranslation();
  const hot = mysteryStreak > 0;

  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link
        href="/play/mystery"
        onClick={() => playSound("click")}
        className={[
          "relative flex w-full items-center gap-3 overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
          hot
            ? "border-amber-300/55"
            : "border-violet-400/40",
        ].join(" ")}
      >
        <div
          className={[
            "absolute inset-0 bg-linear-to-br",
            hot
              ? "from-[#5c3d0a] via-[#9a6b12] to-[#2a1c06]"
              : "from-[#2e1065] via-[#4c1d95] to-[#1e1b4b]",
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
        {hot && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full bg-amber-300/40 blur-2xl"
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        )}

        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/25 bg-black/30 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/mystery.png"
            alt=""
            aria-hidden
            draggable={false}
            className="h-10 w-10 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
          />
        </span>

        <div className="relative min-w-0 flex-1 text-start">
          <p className="font-display text-sm font-black text-white drop-shadow-sm">
            {t("play.mysteryTitle")}
          </p>
          <p className="mt-0.5 truncate font-display text-[11px] font-bold text-white/70">
            {hot
              ? t("mystery.streak", {
                  n: toLocaleDigits(mysteryStreak, locale),
                })
              : t("club.mysteryChipIdle")}
          </p>
        </div>

        <span className="relative inline-flex min-h-9 shrink-0 items-center gap-1 rounded-bubble bg-accent px-2.5 py-1.5 font-display text-[11px] font-black text-accent-foreground shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          {t("play.mysteryCta")}
        </span>
      </Link>
    </motion.div>
  );
}
