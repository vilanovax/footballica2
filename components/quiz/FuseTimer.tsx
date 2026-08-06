"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type FuseTimerHandle = {
  /** Drive the fuse bar (0–1) without React re-renders. */
  setRatio: (ratio: number) => void;
};

type FuseTimerProps = {
  paused?: boolean;
};

const FILL: Record<"safe" | "warning" | "danger", string> = {
  safe: "linear-gradient(90deg, hsl(96 78% 44%), hsl(52 96% 54%))",
  warning: "linear-gradient(90deg, hsl(28 96% 52%), hsl(46 100% 52%))",
  danger: "linear-gradient(90deg, hsl(0 88% 46%), hsl(16 92% 52%))",
};

/**
 * Burning-fuse timer. Progress is applied imperatively via ref (rAF → scaleX)
 * so the match parent can tick the clock without re-rendering every frame.
 */
export const FuseTimer = forwardRef<FuseTimerHandle, FuseTimerProps>(
  function FuseTimer({ paused = false }, ref) {
    const fillRef = useRef<HTMLDivElement>(null);
    const flameRef = useRef<HTMLDivElement>(null);
    const toneRef = useRef<"safe" | "warning" | "danger">("safe");

    useImperativeHandle(ref, () => ({
      setRatio: (ratio: number) => {
        const r = Math.max(0, Math.min(1, ratio));
        const fill = fillRef.current;
        const flame = flameRef.current;
        if (fill) {
          fill.style.transform = `scaleX(${r})`;
        }
        if (flame) {
          flame.style.left = `calc(${r * 100}% - 12px)`;
        }

        const nextTone: "safe" | "warning" | "danger" =
          r <= 0.3 ? "danger" : r <= 0.6 ? "warning" : "safe";
        if (fill && toneRef.current !== nextTone) {
          toneRef.current = nextTone;
          fill.style.backgroundImage = FILL[nextTone];
          fill.dataset.tone = nextTone;
        }
      },
    }));

    return (
      <div className="relative h-5 w-full">
        <div className="absolute inset-0 overflow-hidden rounded-full border border-border bg-muted shadow-fantasy-sm">
          <div
            ref={fillRef}
            data-tone="safe"
            className={[
              "h-full w-full origin-left rounded-full will-change-transform",
              paused
                ? "opacity-100"
                : "data-[tone=danger]:motion-safe:animate-[fuse-pulse_0.55s_ease-in-out_infinite]",
            ].join(" ")}
            style={{
              transform: "scaleX(1)",
              backgroundImage: FILL.safe,
            }}
          />
        </div>

        <div
          ref={flameRef}
          className={[
            "pointer-events-none absolute top-1/2 text-xl leading-none drop-shadow will-change-[left]",
            paused
              ? ""
              : "motion-safe:animate-[fuse-flicker-flame_0.45s_ease-in-out_infinite]",
          ].join(" ")}
          style={{ left: "calc(100% - 12px)", transform: "translateY(-50%)" }}
          aria-hidden
        >
          🔥
        </div>
      </div>
    );
  },
);
