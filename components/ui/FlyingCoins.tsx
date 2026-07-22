"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export type FlyingBurst = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  count?: number;
};

type FlyingCoinsProps = {
  bursts: FlyingBurst[];
  onBurstDone?: (id: string) => void;
};

const COIN_COUNT = 6;
const FLIGHT_MS = 900;

function readCoinTargetCenter(): { x: number; y: number } | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("coin-balance-target");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Spawn a burst from a click / button rect toward the Hub coin pill. */
export function spawnFlyingCoinsToHeader(
  origin: { x: number; y: number } | DOMRect,
): FlyingBurst | null {
  const from =
    "width" in origin
      ? { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 }
      : origin;
  const to = readCoinTargetCenter();
  if (!to) return null;
  return {
    id: `coins-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from,
    to,
    count: COIN_COUNT,
  };
}

/**
 * Portal overlay — coins arc from claim button to `#coin-balance-target`.
 */
export function FlyingCoins({ bursts, onBurstDone }: FlyingCoinsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-100 overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <Burst key={burst.id} burst={burst} onDone={onBurstDone} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function Burst({
  burst,
  onDone,
}: {
  burst: FlyingBurst;
  onDone?: (id: string) => void;
}) {
  const n = burst.count ?? COIN_COUNT;

  useEffect(() => {
    const t = window.setTimeout(() => onDone?.(burst.id), FLIGHT_MS + 80);
    return () => window.clearTimeout(t);
  }, [burst.id, onDone]);

  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const t = i / Math.max(1, n - 1);
        const scatterX = (Math.random() - 0.5) * 36;
        const scatterY = (Math.random() - 0.5) * 24;
        const midX =
          burst.from.x +
          (burst.to.x - burst.from.x) * 0.45 +
          scatterX * 1.4;
        const midY = Math.min(burst.from.y, burst.to.y) - 48 - t * 28;
        return (
          <motion.span
            key={`${burst.id}-${i}`}
            aria-hidden
            className="absolute text-xl drop-shadow-md"
            style={{ left: 0, top: 0 }}
            initial={{
              opacity: 0,
              x: burst.from.x + scatterX,
              y: burst.from.y + scatterY,
              scale: 0.4,
            }}
            animate={{
              opacity: [0, 1, 1, 0.85, 0],
              x: [burst.from.x + scatterX, midX, burst.to.x],
              y: [burst.from.y + scatterY, midY, burst.to.y],
              scale: [0.45, 1.15, 0.7],
              rotate: [0, i % 2 === 0 ? 25 : -20, 0],
            }}
            transition={{
              duration: FLIGHT_MS / 1000,
              delay: i * 0.045,
              ease: [0.22, 0.68, 0.2, 1],
            }}
          >
            🪙
          </motion.span>
        );
      })}
    </>
  );
}

export const FLYING_COINS_HIT_MS = FLIGHT_MS;
