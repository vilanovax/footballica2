"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { QuizLocale } from "@/lib/quiz/types";

type ExplanationFactProps = {
  explanation: { en: string; fa: string } | null | undefined;
  /** When false/null, the box is hidden (pre-reveal). */
  visible: boolean;
};

/**
 * Soft "Did you know?" trivia card shown after the correct answer is revealed.
 */
export function ExplanationFact({
  explanation,
  visible,
}: ExplanationFactProps) {
  const { t, locale } = useTranslation();
  const lang = locale as QuizLocale;
  const text =
    explanation?.[lang]?.trim() ||
    explanation?.en?.trim() ||
    explanation?.fa?.trim() ||
    "";

  return (
    <AnimatePresence>
      {visible && text ? (
        <motion.div
          key="did-you-know"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.18 }}
          className="rounded-2xl bg-amber-500/12 px-3.5 py-3 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
          role="note"
        >
          <p className="font-display text-[11px] font-black uppercase tracking-widest text-amber-200">
            {t("quiz.didYouKnow")}
          </p>
          <p className="mt-1 font-display text-sm font-bold leading-snug text-white/85">
            {text}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
