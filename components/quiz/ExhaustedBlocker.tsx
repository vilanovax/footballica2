"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

/** Shown when stamina is empty — gates entry to a match (PRD §3 Gate). */
export function ExhaustedBlocker() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="w-full max-w-xs rounded-bubble-xl border border-border bg-surface p-6 text-center shadow-fantasy-lg"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ repeat: Infinity, repeatDelay: 1.5, duration: 0.8 }}
          className="text-6xl"
          aria-hidden
        >
          😮‍💨
        </motion.div>

        <h1 className="mt-3 font-display text-2xl font-bold text-foreground">
          {t("exhausted.title")}
        </h1>

        <p className="mt-3 font-body text-sm font-semibold text-muted-foreground">
          {t("exhausted.desc")}
        </p>

        <Link
          href="/club"
          className="btn-fantasy btn-fantasy-primary mt-5 w-full justify-center"
        >
          {t("common.backToClub")}
        </Link>
      </motion.div>
    </section>
  );
}
