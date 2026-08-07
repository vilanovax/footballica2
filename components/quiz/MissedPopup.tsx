"use client";

import { motion } from "framer-motion";
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
      className="absolute inset-0 z-50 flex items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-hidden
      />

      <motion.div
        role="alertdialog"
        aria-label={t("quiz.missed")}
        initial={{ scale: 0.7, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative w-full max-w-xs overflow-hidden rounded-[1.5rem] bg-linear-to-b from-[#431407] via-[#0f172a] to-[#1c0a05] px-5 pb-5 pt-6 text-center shadow-[0_0_0_1px_rgba(251,113,133,0.45),0_16px_40px_rgba(0,0,0,0.55)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 top-0 h-28 w-28 rounded-full bg-rose-400/25 blur-3xl"
        />

        <motion.div
          animate={{ rotate: [0, -10, 10, -6, 0] }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_0_0_rgba(0,0,0,0.35)]"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/broken-heart.png"
            alt=""
            draggable={false}
            className="h-10 w-10 object-contain"
          />
        </motion.div>

        <h2 className="relative mt-3 font-display text-2xl font-black text-rose-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
          {t("quiz.missed")}
        </h2>

        {/* Future-proof: disabled superpower slot (booster cards, PRD §5) */}
        <button
          type="button"
          disabled
          aria-disabled
          className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-black/40 px-4 py-3 font-display text-sm font-black text-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/energy.png"
            alt=""
            draggable={false}
            className="h-5 w-5 object-contain opacity-50"
          />
          <span>{t("quiz.useSuperpower")}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
            {t("common.soon")}
          </span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="relative mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-amber-300/45 bg-linear-to-b from-accent to-[hsl(38_92%_42%)] font-display text-base font-black text-accent-foreground shadow-[0_4px_0_0_rgba(120,70,0,0.5)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(120,70,0,0.5)]"
        >
          {t("common.continue")}
        </button>
      </motion.div>
    </motion.div>
  );
}
