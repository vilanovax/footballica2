"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameIconWell } from "@/components/ui/game";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional short subtitle under the title. */
  subtitle?: string;
  children: React.ReactNode;
  /** Accessible label for the close control. */
  closeLabel?: string;
  /** `dark` = Arena / immersive game sheets (DESIGN.md). */
  tone?: "default" | "dark";
  /** `overlay` stacks above another open sheet (e.g. assign picker). */
  layer?: "default" | "overlay";
};

/**
 * Shared mobile bottom sheet. Dark tone = Arena chrome (pitch tokens).
 * Light tone = App surface (Day/Night themeable).
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  closeLabel = "Close",
  tone = "default",
  layer = "default",
}: BottomSheetProps) {
  const dark = tone === "dark";
  const zClass = layer === "overlay" ? "z-[80]" : "z-[70]";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    if (layer === "overlay") {
      return () => window.removeEventListener("keydown", onKey);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, layer]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 flex items-end justify-center sm:items-center sm:p-4",
            zClass,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-[5px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bottom-sheet-title"
            initial={{ y: "100%", opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "40%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "relative z-10 flex max-h-[min(85dvh,40rem)] w-full max-w-mobile flex-col overflow-hidden rounded-t-bubble-xl shadow-fantasy-lg sm:rounded-bubble-xl",
              dark ? "game-sheet" : "border border-border bg-surface",
            )}
          >
            {dark && (
              <div aria-hidden className="game-sheet-wash pointer-events-none absolute inset-x-0 top-0 h-28" />
            )}
            <div
              className={cn(
                "relative flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4",
                dark
                  ? "shadow-[inset_0_-1px_0_0_hsl(var(--arena-ring)/0.18)]"
                  : "border-b border-border",
              )}
            >
              <div className="min-w-0 flex-1 text-start">
                <div
                  aria-hidden
                  className={cn(
                    "mx-auto mb-3 h-1 w-10 rounded-full sm:hidden",
                    dark ? "bg-arena-ring/40" : "bg-muted-foreground/30",
                  )}
                />
                <h2
                  id="bottom-sheet-title"
                  className={cn(
                    "font-display text-lg font-black",
                    dark ? "text-arena-fg" : "text-foreground",
                  )}
                >
                  {title}
                </h2>
                {subtitle && (
                  <p
                    className={cn(
                      "mt-0.5 font-body text-xs font-semibold",
                      dark ? "text-arena-muted" : "text-muted-foreground",
                    )}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
              {dark ? (
                <button
                  type="button"
                  aria-label={closeLabel}
                  onClick={onClose}
                  className="shrink-0 transition-transform active:scale-90"
                >
                  <GameIconWell size="md" src="/icons/close.png" />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={closeLabel}
                  onClick={onClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-transform active:scale-90"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <div className="relative overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
