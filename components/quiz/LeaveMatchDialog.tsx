"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type LeaveMatchDialogProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

/** Confirm before abandoning an in-flight quiz match. */
export function LeaveMatchDialog({
  open,
  onStay,
  onLeave,
}: LeaveMatchDialogProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="leave-match-dialog"
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label={t("quiz.leaveStay")}
            onClick={onStay}
            className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-match-title"
            aria-describedby="leave-match-desc"
            className="relative w-full max-w-[22rem] overflow-hidden rounded-bubble-xl border border-border bg-surface p-6 pt-7 text-center shadow-fantasy-lg"
            initial={{ scale: 0.92, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent/20 to-transparent"
            />

            <div className="relative mx-auto mb-5 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_5px_0_0_hsl(var(--accent-deep)),0_10px_24px_hsl(var(--accent)/0.35)] ring-4 ring-accent/25">
              <AlertTriangle className="h-8 w-8" strokeWidth={2.75} />
            </div>

            <h2
              id="leave-match-title"
              className="relative font-display text-xl font-bold tracking-tight text-foreground"
            >
              {t("quiz.leaveTitle")}
            </h2>
            <p
              id="leave-match-desc"
              className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              {t("quiz.leaveBody")}
            </p>

            <div className="relative mt-7 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onStay}
                className="game-cta game-cta-primary w-full"
              >
                {t("quiz.leaveStay")}
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="flex min-h-touch w-full items-center justify-center rounded-bubble border-2 border-destructive/50 bg-destructive/10 px-5 py-3 font-display text-base font-bold text-destructive transition-transform active:scale-[0.98] active:bg-destructive/15"
              >
                {t("quiz.leaveConfirm")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
