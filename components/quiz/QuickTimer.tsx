"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

type QuickTimerProps = {
  timeLeftMs: number;
  /** Full per-question allotment, so the bar can compute its ratio. */
  totalMs: number;
  paused?: boolean;
};

/**
 * Rapid-fire countdown for Quick Match. A slim, electric bar that drains left
 * → right, going hot as it empties. Deliberately lighter than the Penalty fuse
 * to sell the faster, snappier pace.
 */
export function QuickTimer({ timeLeftMs, totalMs, paused = false }: QuickTimerProps) {
  const ratio = Math.max(0, Math.min(1, timeLeftMs / totalMs));
  const danger = ratio <= 0.3;
  const warning = ratio <= 0.6 && !danger;

  const fill = danger
    ? "linear-gradient(90deg, hsl(0 88% 50%), hsl(28 96% 54%))"
    : warning
      ? "linear-gradient(90deg, hsl(28 96% 54%), hsl(52 96% 56%))"
      : "linear-gradient(90deg, hsl(210 90% 54%), hsl(190 92% 52%))";

  return (
    <div className="flex items-center gap-2">
      <motion.span
        className="text-lg"
        aria-hidden
        animate={
          paused ? { scale: 1 } : { scale: danger ? [1, 1.25, 1] : [1, 1.12, 1] }
        }
        transition={{ repeat: Infinity, duration: danger ? 0.35 : 0.6 }}
      >
        <Zap
          className="h-5 w-5"
          strokeWidth={2.5}
          style={{
            color: danger
              ? "hsl(0 88% 52%)"
              : warning
                ? "hsl(28 96% 54%)"
                : "hsl(210 90% 54%)",
          }}
          fill="currentColor"
        />
      </motion.span>

      <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-border bg-muted shadow-fantasy-sm">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundImage: fill }}
          animate={{
            width: `${ratio * 100}%`,
            opacity: danger && !paused ? [1, 0.55, 1] : 1,
          }}
          transition={{
            width: { ease: "linear", duration: 0.1 },
            opacity: { repeat: Infinity, duration: 0.4 },
          }}
        />
      </div>
    </div>
  );
}
