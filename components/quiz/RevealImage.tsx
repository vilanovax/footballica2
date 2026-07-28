"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

/** Full soft-focus → sharp timeline while the player still has time to answer. */
const REVEAL_MS = 9_500;

type RevealImageProps = {
  src: string;
  /** Snap to sharp (answer revealed / locked). */
  cleared?: boolean;
  /** Remount key when the question changes. */
  resetKey?: string;
};

/**
 * Progressive REVEAL_IMAGE prompt — heavy blur + fog that clears over time.
 * Self-timed so every mode (Penalty / Quick / Survival / Duel) gets the feel
 * without wiring match timers into the format layer.
 */
export function RevealImage({ src, cleared = false, resetKey }: RevealImageProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(reduceMotion ? 0.55 : 0);

  useEffect(() => {
    if (cleared) {
      setProgress(1);
      return;
    }
    if (reduceMotion) {
      setProgress(0.55);
      return;
    }

    setProgress(0);
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / REVEAL_MS);
      // Ease-out so early frames stay mysterious, late frames rush clarity.
      const eased = 1 - (1 - p) ** 2.2;
      setProgress(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [src, resetKey, cleared, reduceMotion]);

  const blurPx = cleared ? 0 : lerp(22, 0, progress);
  const saturate = cleared ? 1 : lerp(0.35, 1, progress);
  const brightness = cleared ? 1 : lerp(1.15, 1, progress);
  const scale = cleared ? 1 : lerp(1.08, 1, progress);
  const fog = cleared ? 0 : lerp(0.55, 0, progress);
  const showHint = !cleared && progress < 0.92;

  return (
    <div className="mt-3">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/50 shadow-fantasy-sm">
        <motion.div
          className="relative mx-auto max-h-52 w-full"
          animate={{ scale }}
          transition={{ type: "tween", duration: 0.12, ease: "linear" }}
          style={{ originX: 0.5, originY: 0.5 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="mx-auto max-h-52 w-full select-none object-contain"
            style={{
              filter: `blur(${blurPx.toFixed(2)}px) saturate(${saturate.toFixed(2)}) brightness(${brightness.toFixed(2)}) contrast(1.08)`,
              transition: cleared ? "filter 280ms ease-out" : undefined,
            }}
          />
        </motion.div>

        {/* Soft fog veil that lifts with progress */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/50"
          style={{ opacity: fog }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 backdrop-blur-[1px]"
          style={{ opacity: fog * 0.65 }}
        />

        {/* Clarity meter */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
          <motion.div
            className="h-full bg-primary"
            style={{ width: `${(cleared ? 1 : progress) * 100}%` }}
          />
        </div>
      </div>

      {showHint ? (
        <p className="mt-1.5 text-center font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("quiz.revealFocusing")}
        </p>
      ) : cleared ? (
        <p className="mt-1.5 text-center font-display text-[11px] font-bold uppercase tracking-wider text-primary">
          {t("quiz.revealClear")}
        </p>
      ) : null}
    </div>
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}
