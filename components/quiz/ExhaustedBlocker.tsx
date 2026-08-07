"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";

/** Shown when stamina is empty — gates entry to a match (PRD §3 Gate). */
export function ExhaustedBlocker() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="w-full max-w-xs"
      >
        <GamePanel tone="rose" className="p-6 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <GameIconWell
              size="xl"
              src="/icons/energy.png"
              className="mx-auto h-20 w-20"
              iconClassName="h-11 w-11"
            />
          </motion.div>

          <h1 className="mt-3 font-display text-2xl font-bold text-white">
            {t("exhausted.title")}
          </h1>

          <p className="mt-3 font-display text-sm font-bold text-white/65">
            {t("exhausted.desc")}
          </p>

          <Link
            href="/club"
            className="game-cta game-cta-primary mt-5 flex w-full items-center justify-center"
          >
            {t("common.backToClub")}
          </Link>
        </GamePanel>
      </motion.div>
    </section>
  );
}
