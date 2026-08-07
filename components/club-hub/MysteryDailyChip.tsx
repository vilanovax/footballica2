"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { GameIconWell, GamePanel } from "@/components/ui/game";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  mysteryStreak: number;
};

/** Hub shortcut to Game of the Day — Arena panel chrome. */
export function MysteryDailyChip({ mysteryStreak }: Props) {
  const { t, locale } = useTranslation();
  const hot = mysteryStreak > 0;

  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link href="/play/mystery" onClick={() => playSound("click")}>
        <GamePanel
          tone={hot ? "amber" : "emerald"}
          className="flex w-full items-center gap-3 px-3 py-3"
        >
          {hot && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full bg-amber-300/40 blur-2xl"
              animate={{ opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          )}

          <GameIconWell
            size="lg"
            amber={hot}
            src="/icons/mystery.png"
            iconClassName="h-10 w-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
          />

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
        </GamePanel>
      </Link>
    </motion.div>
  );
}
