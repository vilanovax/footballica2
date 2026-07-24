"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional short subtitle under the title. */
  subtitle?: string;
  children: React.ReactNode;
  /** Accessible label for the close control. */
  closeLabel?: string;
};

/**
 * Shared mobile bottom sheet (Framer Motion). Used by Stadium, Upgrade details,
 * and Leaderboard prize tiers — one interaction pattern across the app.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  closeLabel = "Close",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[5px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bottom-sheet-title"
            initial={{ y: "100%", opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "40%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative z-10 flex max-h-[min(85dvh,40rem)] w-full max-w-mobile flex-col rounded-t-bubble-xl border border-border bg-surface shadow-fantasy-lg sm:rounded-bubble-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 pb-3 pt-4">
              <div className="min-w-0 flex-1 text-start">
                <div
                  aria-hidden
                  className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden"
                />
                <h2
                  id="bottom-sheet-title"
                  className="font-display text-lg font-bold text-foreground"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform active:scale-95"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
