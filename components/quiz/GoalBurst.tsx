"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Floating "Goal!" celebration text. Pops up, drifts, and fades.
 * Rendered only during a correct reveal.
 */
export function GoalBurst() {
  const { t } = useTranslation();
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.3, y: 30, rotate: -8 }}
        animate={{ scale: [0.3, 1.25, 1], y: [30, -10, -40], rotate: [-8, 4, 0] }}
        exit={{ opacity: 0, y: -70, scale: 0.9 }}
        transition={{ duration: 1.2, times: [0, 0.45, 1], ease: "easeOut" }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-5xl drop-shadow" aria-hidden>
          ⚽️
        </span>
        <span className="font-display text-4xl font-bold text-primary drop-shadow">
          {t("quiz.goal")}
        </span>
      </motion.div>
    </motion.div>
  );
}
