"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type QuickTimerHandle = {
  /** Drive the bar (0–1) without React re-renders. */
  setRatio: (ratio: number) => void;
};

type QuickTimerProps = {
  paused?: boolean;
};

const FILL: Record<"safe" | "warning" | "danger", string> = {
  safe: "linear-gradient(90deg, hsl(210 90% 54%), hsl(190 92% 52%))",
  warning: "linear-gradient(90deg, hsl(28 96% 54%), hsl(52 96% 56%))",
  danger: "linear-gradient(90deg, hsl(0 88% 50%), hsl(28 96% 54%))",
};

/**
 * Rapid-fire countdown. Progress is applied imperatively via ref (rAF → scaleX).
 */
export const QuickTimer = forwardRef<QuickTimerHandle, QuickTimerProps>(
  function QuickTimer({ paused = false }, ref) {
    const fillRef = useRef<HTMLDivElement>(null);
    const zapRef = useRef<HTMLSpanElement>(null);
    const toneRef = useRef<"safe" | "warning" | "danger">("safe");

    useImperativeHandle(ref, () => ({
      setRatio: (ratio: number) => {
        const r = Math.max(0, Math.min(1, ratio));
        const fill = fillRef.current;
        if (fill) {
          fill.style.transform = `scaleX(${r})`;
        }

        const nextTone: "safe" | "warning" | "danger" =
          r <= 0.3 ? "danger" : r <= 0.6 ? "warning" : "safe";
        if (fill && toneRef.current !== nextTone) {
          toneRef.current = nextTone;
          fill.style.backgroundImage = FILL[nextTone];
          fill.dataset.tone = nextTone;
          if (zapRef.current) zapRef.current.dataset.tone = nextTone;
        }
      },
    }));

    return (
      <div className="flex items-center gap-2">
        <span
          ref={zapRef}
          data-tone="safe"
          aria-hidden
          className={[
            "text-lg leading-none",
            paused
              ? ""
              : "motion-safe:animate-[fuse-flicker-zap_0.5s_ease-in-out_infinite] data-[tone=danger]:motion-safe:animate-[fuse-flicker-zap_0.35s_ease-in-out_infinite]",
          ].join(" ")}
        >
          ⚡
        </span>

        <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-border bg-muted shadow-fantasy-sm">
          <div
            ref={fillRef}
            data-tone="safe"
            className={[
              "h-full w-full origin-left rounded-full will-change-transform",
              paused
                ? "opacity-100"
                : "data-[tone=danger]:motion-safe:animate-[fuse-pulse_0.45s_ease-in-out_infinite]",
            ].join(" ")}
            style={{
              transform: "scaleX(1)",
              backgroundImage: FILL.safe,
            }}
          />
        </div>
      </div>
    );
  },
);
