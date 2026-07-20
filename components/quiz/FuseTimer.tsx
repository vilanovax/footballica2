"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { KICK_DURATION_MS } from "@/lib/quiz/scoring";

type FuseTimerProps = {
  timeLeftMs: number;
  paused?: boolean;
};

/**
 * A burning-fuse timer: the fuse shrinks as time runs out and the flame rides
 * its tip. Turns from primary → accent → destructive as it burns down.
 */
export function FuseTimer({ timeLeftMs, paused = false }: FuseTimerProps) {
  const ratio = Math.max(0, Math.min(1, timeLeftMs / KICK_DURATION_MS));
  const danger = ratio <= 0.3;
  const warning = ratio <= 0.6 && !danger;

  // Warning gradient shifts hotter as time drains: lime→yellow, then
  // yellow→orange, then orange→red for a rising sense of urgency.
  const fillGradient = danger
    ? "linear-gradient(90deg, hsl(0 88% 46%), hsl(16 92% 52%))"
    : warning
      ? "linear-gradient(90deg, hsl(28 96% 52%), hsl(46 100% 52%))"
      : "linear-gradient(90deg, hsl(96 78% 44%), hsl(52 96% 54%))";

  return (
    <div className="relative h-5 w-full">
      <div className="absolute inset-0 overflow-hidden rounded-full border border-border bg-muted shadow-fantasy-sm">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundImage: fillGradient }}
          animate={{
            width: `${ratio * 100}%`,
            opacity: danger && !paused ? [1, 0.6, 1] : 1,
          }}
          transition={{
            width: { ease: "linear", duration: 0.1 },
            opacity: { repeat: Infinity, duration: 0.5 },
          }}
        />
      </div>

      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        animate={{ left: `calc(${ratio * 100}% - 12px)` }}
        transition={{ ease: "linear", duration: 0.1 }}
      >
        <motion.div
          animate={
            paused
              ? { scale: 1, rotate: 0 }
              : { scale: [1, 1.25, 1], rotate: [-8, 8, -8] }
          }
          transition={{ repeat: Infinity, duration: 0.4 }}
        >
          <Flame
            className="h-6 w-6 drop-shadow"
            style={{
              color: danger
                ? "hsl(0 88% 48%)"
                : warning
                  ? "hsl(28 96% 52%)"
                  : "hsl(var(--accent))",
            }}
            fill="currentColor"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
