"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type StatusBarProps = {
  coins: number;
  fans: number;
  stamina: number;
  maxStamina: number;
};

export function StatusBar({ coins, fans, stamina, maxStamina }: StatusBarProps) {
  const prevCoins = useRef(coins);
  const [pulse, setPulse] = useState(false);

  // Subtle pulse only when coins recently INCREASED (e.g. after a match).
  useEffect(() => {
    if (coins > prevCoins.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      prevCoins.current = coins;
      return () => clearTimeout(t);
    }
    prevCoins.current = coins;
  }, [coins]);

  return (
    <div className="grid grid-cols-3 gap-2">
      <motion.div
        animate={pulse ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
        className={[
          "flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 shadow-fantasy-sm",
          pulse ? "ring-2 ring-accent" : "",
        ].join(" ")}
      >
        <span aria-hidden>💰</span>
        <span className="font-display text-sm font-bold text-accent-deep tabular-nums">
          {coins}
        </span>
      </motion.div>

      <div className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 shadow-fantasy-sm">
        <span aria-hidden>👥</span>
        <span className="font-display text-sm font-bold text-secondary tabular-nums">
          {fans}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 shadow-fantasy-sm">
        <span aria-hidden>⚡</span>
        <span className="font-display text-sm font-bold text-primary tabular-nums">
          {stamina}/{maxStamina}
        </span>
      </div>
    </div>
  );
}
