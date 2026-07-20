"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type MissedPopupProps = {
  onContinue: () => void;
};

/**
 * Dramatic "Missed!" overlay after a wrong/timed-out kick.
 * Reserves UI space for future booster cards via a disabled "Use Superpower"
 * action (see PRD §5 — Collectible Super-Power Cards).
 */
export function MissedPopup({ onContinue }: MissedPopupProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-hidden
      />

      <motion.div
        role="alertdialog"
        aria-label={t("quiz.missed")}
        initial={{ scale: 0.7, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative w-full max-w-xs rounded-bubble-lg border border-destructive bg-surface p-6 text-center shadow-fantasy-lg"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -6, 0] }}
          transition={{ duration: 0.5 }}
          className="text-5xl"
          aria-hidden
        >
          🧤
        </motion.div>

        <h2 className="mt-2 font-display text-2xl font-bold text-destructive">
          {t("quiz.missed")}
        </h2>

        {/* Future-proof: disabled superpower slot (booster cards, PRD §5) */}
        <button
          type="button"
          disabled
          aria-disabled
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-bubble border border-border bg-muted px-4 py-3 font-display text-sm font-bold text-muted-foreground opacity-50"
        >
          <Zap className="h-5 w-5" />
          <span>{t("quiz.useSuperpower")}</span>
          <span className="rounded-full bg-border px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {t("common.soon")}
          </span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="btn-fantasy btn-fantasy-secondary mt-3 w-full justify-center"
        >
          {t("common.continue")}
        </button>
      </motion.div>
    </motion.div>
  );
}
