"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { STAMINA_REGEN_INTERVAL_MS } from "@/lib/club/stamina";
import { useTranslation } from "@/lib/i18n/useTranslation";

type StatusBarProps = {
  coins: number;
  fans: number;
  stamina: number;
  maxStamina: number;
  msUntilNext: number;
};

function formatMMSS(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function StatusBar({
  coins,
  fans,
  stamina,
  maxStamina,
  msUntilNext,
}: StatusBarProps) {
  const { t } = useTranslation();
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

  // Live stamina countdown (local, no reload). Resync when server data changes.
  const [localStamina, setLocalStamina] = useState(stamina);
  const [remainingMs, setRemainingMs] = useState(msUntilNext);
  const remainingRef = useRef(msUntilNext);

  useEffect(() => {
    setLocalStamina(stamina);
    setRemainingMs(msUntilNext);
    remainingRef.current = msUntilNext;
  }, [stamina, maxStamina, msUntilNext]);

  useEffect(() => {
    if (localStamina >= maxStamina) return;

    const id = setInterval(() => {
      remainingRef.current -= 1000;
      if (remainingRef.current <= 0) {
        setLocalStamina((s) => Math.min(maxStamina, s + 1));
        remainingRef.current = STAMINA_REGEN_INTERVAL_MS;
      }
      setRemainingMs(remainingRef.current);
    }, 1000);

    return () => clearInterval(id);
  }, [localStamina, maxStamina]);

  const regenerating = localStamina < maxStamina;

  return (
    <div className="grid grid-cols-3 items-start gap-2">
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

      <div className="flex flex-col items-center gap-1">
        <div className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 shadow-fantasy-sm">
          <span aria-hidden>⚡</span>
          <span className="font-display text-sm font-bold text-primary tabular-nums">
            {localStamina}/{maxStamina}
          </span>
        </div>
        {regenerating && (
          <span className="font-display text-[11px] font-bold text-muted-foreground tabular-nums">
            {t("status.plusOneIn", { time: formatMMSS(remainingMs) })}
          </span>
        )}
      </div>
    </div>
  );
}
