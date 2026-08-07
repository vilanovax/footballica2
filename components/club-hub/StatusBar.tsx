"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { buyStaminaRefill, type ShopErrorCode } from "@/actions/shop";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { staminaRegenIntervalMs } from "@/lib/club/stamina";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import { GamePanel } from "@/components/ui/game";

type StatusBarProps = {
  coins: number;
  stamina: number;
  maxStamina: number;
  msUntilNext: number;
  /** Medical bay level — drives the local +1 tick interval. */
  medicalLevel: number;
  staminaRefillCost: number;
  onClubUpdate?: (club: ClubSnapshot) => void;
};

function formatMMSS(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Consumables only — coins + stamina. Fans live on the Stadium hero. */
export function StatusBar({
  coins,
  stamina,
  maxStamina,
  msUntilNext,
  medicalLevel,
  staminaRefillCost,
  onClubUpdate,
}: StatusBarProps) {
  const { t, locale } = useTranslation();
  const prevCoins = useRef(coins);
  const [pulse, setPulse] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const regenIntervalMs = staminaRegenIntervalMs(medicalLevel);

  useEffect(() => {
    if (coins > prevCoins.current) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 700);
      prevCoins.current = coins;
      return () => clearTimeout(timer);
    }
    prevCoins.current = coins;
  }, [coins]);

  const [localStamina, setLocalStamina] = useState(stamina);
  const [remainingMs, setRemainingMs] = useState(msUntilNext);
  const remainingRef = useRef(msUntilNext);

  useEffect(() => {
    setLocalStamina(stamina);
    setRemainingMs(msUntilNext);
    remainingRef.current = msUntilNext;
  }, [stamina, maxStamina, msUntilNext, medicalLevel]);

  useEffect(() => {
    if (localStamina >= maxStamina) return;
    const id = setInterval(() => {
      remainingRef.current -= 1000;
      if (remainingRef.current <= 0) {
        setLocalStamina((s) => Math.min(maxStamina, s + 1));
        remainingRef.current = regenIntervalMs;
      }
      setRemainingMs(remainingRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [localStamina, maxStamina, regenIntervalMs]);

  const regenerating = localStamina < maxStamina;
  const staminaLow = localStamina <= 1;
  const staminaFull = localStamina >= maxStamina;

  function errorMessage(code: ShopErrorCode): string {
    switch (code) {
      case "insufficient":
        return t("shop.errInsufficient");
      case "already_full":
        return t("status.staminaAlreadyFull");
      case "rate_limited":
        return t("shop.errRateLimited");
      default:
        return t("shop.errGeneric");
    }
  }

  function openRefill() {
    playSound("click");
    if (staminaFull) {
      toast.message(t("status.staminaAlreadyFull"));
      return;
    }
    setConfirmOpen(true);
  }

  function confirmRefill() {
    if (pending) return;
    startTransition(async () => {
      const result = await buyStaminaRefill();
      if (result.ok) {
        onClubUpdate?.(result.club);
        setConfirmOpen(false);
        playSound("upgrade");
        haptic(HAPTIC.tap);
        toast.success(t("status.staminaRefilled"));
      } else {
        haptic(HAPTIC.light);
        toast.error(errorMessage(result.code));
        if (result.code === "already_full") setConfirmOpen(false);
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <motion.div
          id="coin-balance-target"
          animate={pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/shop?tab=coins"
            aria-label={t("status.buyCoins")}
            onClick={() => playSound("click")}
            className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-amber-400/40 bg-black/35 px-2.5 py-1.5 shadow-[0_3px_0_0_rgba(0,0,0,0.3)] active:translate-y-px active:shadow-none"
          >
            <ResourceIcon kind="coin" size="md" priority />
            <span className="font-display text-base font-black tabular-nums text-amber-100">
              {toLocaleDigits(coins, locale)}
            </span>
          </Link>
        </motion.div>

        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            aria-label={t("status.refillStamina")}
            onClick={openRefill}
            className={[
              "flex min-h-11 w-full items-center gap-2 rounded-2xl border-2 px-2.5 py-1.5 shadow-[0_3px_0_0_rgba(0,0,0,0.3)] active:translate-y-px active:shadow-none",
              staminaLow
                ? "border-rose-400/50 bg-rose-950/50"
                : "border-sky-400/40 bg-black/35",
            ].join(" ")}
          >
            <ResourceIcon kind="energy" size="md" priority />
            <span
              className={[
                "font-display text-base font-black tabular-nums",
                staminaLow ? "text-rose-200" : "text-sky-100",
              ].join(" ")}
            >
              {toLocaleDigits(localStamina, locale)}/
              {toLocaleDigits(maxStamina, locale)}
            </span>
          </button>
          {regenerating && (
            <span className="px-1 text-end font-display text-[10px] font-bold tabular-nums text-white/55">
              {t("status.plusOneIn", {
                time: toLocaleDigits(formatMMSS(remainingMs), locale),
              })}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !pending && setConfirmOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="stamina-refill-title"
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <GamePanel tone="sky" className="p-5">
              <div className="relative mb-3 flex justify-center" aria-hidden>
                <ResourceIcon kind="energy" size="lg" className="h-12 w-12" />
              </div>
              <h2
                id="stamina-refill-title"
                className="relative text-center font-display text-xl font-black text-white"
              >
                {t("status.refillTitle")}
              </h2>
              <p className="relative mt-2 text-center font-display text-sm font-bold text-white/65">
                {t("status.refillBody", {
                  cost: toLocaleDigits(staminaRefillCost, locale),
                })}
              </p>
              <div className="relative mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmOpen(false)}
                  className="flex min-h-touch items-center justify-center rounded-bubble border-2 border-white/15 bg-black/30 px-3 font-display text-sm font-black text-white/70"
                >
                  {t("common.close")}
                </button>
                <motion.button
                  type="button"
                  disabled={pending || coins < staminaRefillCost}
                  whileTap={pending ? undefined : { y: 3 }}
                  onClick={confirmRefill}
                  className={[
                    "flex min-h-touch flex-col items-center justify-center rounded-bubble px-3 font-display text-sm font-black shadow-[0_4px_0_0_rgba(0,0,0,0.35)]",
                    coins >= staminaRefillCost
                      ? "bg-accent text-accent-foreground"
                      : "bg-white/10 text-white/45",
                  ].join(" ")}
                >
                  {pending ? (
                    "…"
                  ) : (
                    <>
                      <span>{t("status.refillConfirm")}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs opacity-95">
                        <ResourceIcon kind="coin" size="sm" />
                        {toLocaleDigits(staminaRefillCost, locale)}
                      </span>
                    </>
                  )}
                </motion.button>
              </div>
              </GamePanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
