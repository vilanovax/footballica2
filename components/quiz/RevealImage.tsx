"use client";

import { useReducedMotion } from "framer-motion";
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
 * Progressive REVEAL_IMAGE prompt — sharp layer fades in over a static blur
 * plate (no per-frame filter/blur writes). Fog + meter are CSS animations.
 */
export function RevealImage({
  src,
  cleared = false,
  resetKey,
}: RevealImageProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <div className="mt-3" key={resetKey ?? src}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/50 shadow-fantasy-sm">
        <div className="relative mx-auto max-h-52 w-full">
          {/* Static blur plate — filter computed once, never rewritten per frame. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            aria-hidden
            className={[
              "mx-auto max-h-52 w-full select-none object-contain",
              cleared ? "opacity-0" : "opacity-100",
            ].join(" ")}
            style={{
              filter:
                "blur(20px) saturate(0.4) brightness(1.12) contrast(1.08)",
              transform: cleared ? "scale(1)" : "scale(1.06)",
            }}
          />

          {/* Sharp layer fades in via CSS — GPU opacity only. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute inset-0 mx-auto max-h-52 w-full select-none object-contain"
            style={
              cleared
                ? { opacity: 1 }
                : reduceMotion
                  ? { opacity: 0.55 }
                  : {
                      opacity: 0,
                      animation: `reveal-sharp ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                    }
            }
          />
        </div>

        {/* Soft fog veil that lifts with progress */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/50"
          style={
            cleared
              ? { opacity: 0 }
              : reduceMotion
                ? { opacity: 0.25 }
                : {
                    opacity: 0.55,
                    animation: `reveal-fog ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                  }
          }
        />

        {/* Clarity meter — scaleX, not width */}
        <div className="absolute inset-x-0 bottom-0 h-1 origin-left bg-black/20">
          <div
            className="h-full origin-left bg-primary will-change-transform"
            style={
              cleared
                ? { transform: "scaleX(1)" }
                : reduceMotion
                  ? { transform: "scaleX(0.55)" }
                  : {
                      transform: "scaleX(0)",
                      animation: `reveal-meter ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                    }
            }
          />
        </div>
      </div>

      {!cleared ? (
        <p className="mt-1.5 text-center font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("quiz.revealFocusing")}
        </p>
      ) : (
        <p className="mt-1.5 text-center font-display text-[11px] font-bold uppercase tracking-wider text-primary">
          {t("quiz.revealClear")}
        </p>
      )}
    </div>
  );
}
