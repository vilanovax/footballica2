"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { buyStaminaRefill, type ShopErrorCode } from "@/actions/shop";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { STAMINA_REGEN_INTERVAL_MS } from "@/lib/club/stamina";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type StatusBarProps = {
  coins: number;
  fans: number;
  stamina: number;
  maxStamina: number;
  msUntilNext: number;
  /** Soft-currency cost from GameConfig (server). */
  staminaRefillCost: number;
  onClubUpdate?: (club: ClubSnapshot) => void;
};

function formatMMSS(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function PlusChip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={[
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black leading-none",
        className ?? "bg-accent text-accent-foreground",
      ].join(" ")}
    >
      +
    </span>
  );
}

export function StatusBar({
  coins,
  fans,
  stamina,
  maxStamina,
  msUntilNext,
  staminaRefillCost,
  onClubUpdate,
}: StatusBarProps) {
  const { t, locale } = useTranslation();
  const prevCoins = useRef(coins);
  const [pulse, setPulse] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Subtle pulse only when coins recently INCREASED (e.g. after a match).
  useEffect(() => {
    if (coins > prevCoins.current) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 700);
      prevCoins.current = coins;
      return () => clearTimeout(timer);
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
  const staminaLow = localStamina <= 1;
  const staminaFull = localStamina >= maxStamina;

  function errorMessage(code: ShopErrorCode): string {
    switch (code) {
      case "insufficient":
        return t("shop.errInsufficient");
      case "already_full":
        return t("status.staminaAlreadyFull");
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
      <div className="grid grid-cols-3 items-start gap-2">
        <motion.div
          id="coin-balance-target"
          animate={pulse ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
          className={[
            "relative flex items-center justify-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-2 shadow-fantasy-sm",
            pulse ? "ring-2 ring-accent" : "",
          ].join(" ")}
        >
          <span aria-hidden>💰</span>
          <span className="font-display text-sm font-bold text-accent-deep tabular-nums">
            {toLocaleDigits(coins, locale)}
          </span>
          <Link
            href="/shop?tab=coins"
            aria-label={t("status.buyCoins")}
            onClick={() => playSound("click")}
            className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full"
          >
            <PlusChip className="bg-accent text-accent-foreground shadow-fantasy-sm ring-2 ring-surface" />
          </Link>
        </motion.div>

        <div className="flex items-center justify-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-2 shadow-fantasy-sm">
          <span aria-hidden>👥</span>
          <span className="font-display text-sm font-bold text-secondary tabular-nums">
            {toLocaleDigits(fans, locale)}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div
            className={[
              "relative flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 shadow-fantasy-sm transition-colors",
              staminaLow
                ? "border-destructive/40 bg-destructive/10"
                : "border-primary/30 bg-primary/10",
            ].join(" ")}
          >
            <span aria-hidden>⚡</span>
            <span
              className={[
                "font-display text-sm font-bold tabular-nums",
                staminaLow ? "text-destructive" : "text-primary",
              ].join(" ")}
            >
              {toLocaleDigits(localStamina, locale)}/
              {toLocaleDigits(maxStamina, locale)}
            </span>
            <button
              type="button"
              aria-label={t("status.refillStamina")}
              onClick={openRefill}
              className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full"
            >
              <PlusChip
                className={[
                  "shadow-fantasy-sm ring-2 ring-surface",
                  staminaFull
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground",
                ].join(" ")}
              />
            </button>
          </div>
          {regenerating && (
            <span className="font-display text-[11px] font-bold text-muted-foreground tabular-nums">
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
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
              className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 shadow-fantasy"
            >
              <div className="mb-3 flex justify-center text-4xl" aria-hidden>
                ⚡
              </div>
              <h2
                id="stamina-refill-title"
                className="text-center font-display text-xl font-bold text-foreground"
              >
                {t("status.refillTitle")}
              </h2>
              <p className="mt-2 text-center font-body text-sm font-semibold text-muted-foreground">
                {t("status.refillBody", {
                  cost: toLocaleDigits(staminaRefillCost, locale),
                })}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmOpen(false)}
                  className="flex min-h-touch items-center justify-center rounded-bubble border border-border bg-muted px-3 font-display text-sm font-bold text-muted-foreground"
                >
                  {t("common.close")}
                </button>
                <motion.button
                  type="button"
                  disabled={pending || coins < staminaRefillCost}
                  whileTap={pending ? undefined : { y: 3 }}
                  onClick={confirmRefill}
                  className={[
                    "flex min-h-touch flex-col items-center justify-center rounded-bubble px-3 font-display text-sm font-bold",
                    coins >= staminaRefillCost
                      ? "bg-primary text-primary-foreground shadow-btn-3d active:shadow-btn-3d-press"
                      : "bg-muted text-muted-foreground opacity-50",
                  ].join(" ")}
                >
                  {pending ? (
                    "…"
                  ) : (
                    <>
                      <span>{t("status.refillConfirm")}</span>
                      <span className="text-xs opacity-90">
                        💰 {toLocaleDigits(staminaRefillCost, locale)}
                      </span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
