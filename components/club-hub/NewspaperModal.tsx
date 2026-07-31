"use client";

import { motion } from "framer-motion";
import type { NewsPayload, NewsState } from "@/actions/claimDailyNews";
import { BOOSTER_DURATION_HOURS, formatMultiplier } from "@/lib/boosters/boosters";
import { useTranslation } from "@/lib/i18n/useTranslation";

type NewspaperModalProps = {
  news: NewsPayload | null;
  state: NewsState;
  onClaim: () => void;
};

export function NewspaperModal({ news, state, onClaim }: NewspaperModalProps) {
  const { t } = useTranslation();
  // Cooldown: today's claim is spent and nothing is running.
  if (state === "cooldown" || !news) {
    return (
      <motion.div
        className="fixed inset-0 z-[70] mx-auto flex max-w-mobile items-center justify-center px-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          aria-label={t("common.ok")}
          onClick={onClaim}
          className="absolute inset-0 bg-background/75 backdrop-blur-sm"
        />
        <motion.div
          role="dialog"
          aria-label={t("news.masthead")}
          initial={{ scale: 0, rotate: -720, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, rotate: 180, opacity: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 12, mass: 0.9 }}
          className="relative w-full max-w-xs rotate-[-1.5deg] rounded-bubble border-4 border-black/10 bg-[#f6f1e3] p-5 text-center shadow-fantasy-lg"
          style={{ color: "#1a1a1a" }}
        >
          <p className="border-b-2 border-black/70 pb-1 font-display text-xs font-bold uppercase tracking-[0.2em]">
            {t("news.masthead")}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-black/50">
            {t("news.soldOut")}
          </p>
          <div className="my-3 text-5xl" aria-hidden>
            🗞️
          </div>
          <h2 className="font-display text-2xl font-extrabold leading-tight">
            {t("news.thatsAll")}
          </h2>
          <p className="mt-3 font-body text-sm font-bold text-black/70">
            {t("news.comeBack")}
          </p>
          <button
            type="button"
            onClick={onClaim}
            className="btn-fantasy btn-fantasy-secondary mt-5 w-full justify-center"
          >
            {t("common.ok")}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  const alreadyActive = state === "active";
  const isCoin = news.type === "COIN_BOOST";
  const multLabel = formatMultiplier(news.multiplier);
  // `headline` is a translation key for new boosters; fall back to the stored
  // raw text for any legacy booster claimed before keys were introduced.
  const headlineKey = `news.events.${news.headline}`;
  const translated = t(headlineKey);
  const headline = translated === headlineKey ? news.headline : translated;
  return (
    <motion.div
      className="fixed inset-0 z-[70] mx-auto flex max-w-mobile items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label={t("common.ok")}
        onClick={onClaim}
        className="absolute inset-0 bg-background/75 backdrop-blur-sm"
      />

      {/* Newspaper spins in from the center and lands with a bounce. */}
      <motion.div
        role="dialog"
        aria-label={t("news.masthead")}
        initial={{ scale: 0, rotate: -720, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0, rotate: 180, opacity: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 12, mass: 0.9 }}
        className="relative w-full max-w-xs rotate-[-1.5deg] rounded-bubble border-4 border-black/10 bg-[#f6f1e3] p-5 text-center shadow-fantasy-lg"
        style={{ color: "#1a1a1a" }}
      >
        {/* Masthead */}
        <p className="border-b-2 border-black/70 pb-1 font-display text-xs font-bold uppercase tracking-[0.2em]">
          {t("news.masthead")}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-black/50">
          {alreadyActive ? t("news.todayEdition") : t("news.breaking")}
        </p>

        <div className="my-3 text-5xl" aria-hidden>
          {news.emoji}
        </div>

        <h2 className="font-display text-2xl font-extrabold leading-tight">
          {headline}
        </h2>

        {/* Effect callout — “2× 🪙 for 2h” reads faster than “2 برابر سکه”. */}
        <div
          className="mx-auto mt-4 flex w-fit -rotate-1 items-center gap-1.5 rounded-bubble bg-primary px-4 py-2 font-display text-lg font-extrabold text-primary-foreground shadow-fantasy"
          aria-label={`${multLabel}× ${isCoin ? t("result.coins") : t("stadium.fans")} ${t("news.effectForHours", { hours: BOOSTER_DURATION_HOURS })}`}
        >
          <span className="tabular-nums">{multLabel}×</span>
          <span className="text-xl leading-none" aria-hidden>
            {isCoin ? "🪙" : "👥"}
          </span>
          <span className="text-base font-bold">
            {t("news.effectForHours", { hours: BOOSTER_DURATION_HOURS })}
          </span>
        </div>

        <button
          type="button"
          onClick={onClaim}
          className="btn-fantasy btn-fantasy-secondary mt-5 w-full justify-center"
        >
          {alreadyActive ? t("common.nice") : t("news.claim")}
        </button>
      </motion.div>
    </motion.div>
  );
}
