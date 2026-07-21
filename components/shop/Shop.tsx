"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  buyUpgrade,
  buyBooster,
  type BoosterShopType,
  type ShopErrorCode,
  type ShopResult,
} from "@/actions/shop";
import {
  UPGRADE_LIST,
  getClubLevel,
  getUpgradeCost,
  type ClubSnapshot,
} from "@/lib/club/upgrades";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { UpgradeCard } from "@/components/club-hub/UpgradeCard";

type ShopProps = {
  initialClub: ClubSnapshot;
  /** Costs sourced from GameConfig on the server. */
  boosterCosts: Record<BoosterShopType, number>;
};

type Tab = "upgrades" | "boosters";

/** Booster catalog (metadata only — cost + counts come from the server). */
const BOOSTERS: {
  type: BoosterShopType;
  icon: string;
  owned: (c: ClubSnapshot) => number;
}[] = [
  { type: "FIFTY_FIFTY", icon: "✂️", owned: (c) => c.boosterFiftyFifty },
  { type: "FREEZE_TIMER", icon: "❄️", owned: (c) => c.boosterFreezeTimer },
];

export function Shop({ initialClub, boosterCosts }: ShopProps) {
  const { t, locale } = useTranslation();
  const [club, setClub] = useState(initialClub);
  const [tab, setTab] = useState<Tab>("upgrades");
  const [pending, setPending] = useState<string | null>(null);
  const [coinPulse, setCoinPulse] = useState(0);
  const [, startTransition] = useTransition();

  function errorMessage(code: ShopErrorCode): string {
    switch (code) {
      case "insufficient":
        return t("shop.errInsufficient");
      case "maxed":
        return t("shop.errMax");
      default:
        return t("shop.errGeneric");
    }
  }

  function handleResult(result: ShopResult, successMsg: string) {
    if (result.ok) {
      setClub(result.club);
      setCoinPulse((k) => k + 1);
      playSound("upgrade");
      haptic(HAPTIC.tap);
      toast.success(successMsg);
    } else {
      haptic(HAPTIC.light);
      toast.error(errorMessage(result.code));
    }
  }

  function purchaseUpgrade(key: (typeof UPGRADE_LIST)[number]["key"]) {
    if (pending) return;
    setPending(key);
    startTransition(async () => {
      const result = await buyUpgrade(key);
      setPending(null);
      handleResult(result, t("shop.boughtUpgrade", { name: t(`upgrades.${key}.name`) }));
    });
  }

  function purchaseBooster(type: BoosterShopType) {
    if (pending) return;
    setPending(type);
    startTransition(async () => {
      const result = await buyBooster(type);
      setPending(null);
      handleResult(result, t("shop.boughtBooster", { name: t(`shop.boosters.${type}.name`) }));
    });
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      {/* Header + live budget */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
            {t("shop.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-bold leading-tight text-foreground">
            {t("shop.title")}
          </h1>
        </div>
        <Link
          href="/club"
          className="flex h-11 items-center rounded-bubble border border-border bg-surface px-3 font-display text-sm font-bold text-muted-foreground shadow-fantasy-sm"
        >
          {t("common.backToClub")}
        </Link>
      </header>

      <motion.div
        key={coinPulse}
        animate={coinPulse ? { scale: [1, 1.05, 1] } : undefined}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center gap-2 rounded-bubble border-2 border-accent/40 bg-accent/10 px-4 py-3 shadow-fantasy"
      >
        <span className="text-2xl" aria-hidden>
          💰
        </span>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-accent-deep">
            {toLocaleDigits(club.coins, locale)}
          </p>
          <p className="font-display text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground">
            {t("shop.budget")}
          </p>
        </div>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-2 rounded-bubble bg-muted/60 p-1">
        {(["upgrades", "boosters"] as const).map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                playSound("click");
                setTab(key);
              }}
              className={[
                "relative flex-1 rounded-bubble px-3 py-2 font-display text-sm font-bold transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {active && (
                <motion.span
                  layoutId="shop-tab"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-bubble bg-primary shadow-fantasy-sm"
                />
              )}
              <span className="relative">
                {key === "upgrades" ? t("shop.tabUpgrades") : t("shop.tabBoosters")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
        >
          {tab === "upgrades"
            ? UPGRADE_LIST.map((def) => {
                const level = getClubLevel(club, def.key);
                const cost = getUpgradeCost(def.key, level);
                const canAfford = cost !== null && club.coins >= cost;
                return (
                  <UpgradeCard
                    key={def.key}
                    def={def}
                    level={level}
                    cost={cost}
                    canAfford={canAfford}
                    pending={pending === def.key}
                    onUpgrade={() => purchaseUpgrade(def.key)}
                  />
                );
              })
            : BOOSTERS.map((b) => {
                const cost = boosterCosts[b.type];
                const canAfford = club.coins >= cost;
                const isPending = pending === b.type;
                const disabled = !canAfford || isPending;
                return (
                  <div
                    key={b.type}
                    className={[
                      "flex items-center gap-3 rounded-bubble border bg-surface p-3 shadow-fantasy",
                      canAfford ? "border-secondary/40" : "border-border",
                    ].join(" ")}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-bubble bg-muted text-2xl">
                      {b.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-base font-bold text-surface-foreground">
                          {t(`shop.boosters.${b.type}.name`)}
                        </p>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-display text-[10px] font-bold uppercase text-muted-foreground">
                          {t("shop.owned", { n: toLocaleDigits(b.owned(club), locale) })}
                        </span>
                      </div>
                      <p className="truncate font-body text-xs font-semibold text-muted-foreground">
                        {t(`shop.boosters.${b.type}.desc`)}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      disabled={disabled}
                      onClick={() => purchaseBooster(b.type)}
                      whileTap={disabled ? undefined : { y: 4 }}
                      className={[
                        "flex min-h-touch min-w-22 flex-col items-center justify-center rounded-bubble px-3 py-2 font-display text-sm font-bold transition-all",
                        canAfford
                          ? "bg-secondary text-secondary-foreground shadow-btn-3d active:shadow-btn-3d-press"
                          : "bg-muted text-muted-foreground opacity-50",
                      ].join(" ")}
                    >
                      {isPending ? (
                        <span>…</span>
                      ) : (
                        <>
                          <span>{t("shop.buy")}</span>
                          <span
                            className={[
                              "flex items-center gap-1 text-xs",
                              canAfford ? "opacity-90" : "font-bold text-destructive",
                            ].join(" ")}
                          >
                            💰 {toLocaleDigits(cost, locale)}
                          </span>
                        </>
                      )}
                    </motion.button>
                  </div>
                );
              })}

          {tab === "boosters" && (
            <p className="px-1 pt-1 text-center font-body text-xs font-semibold text-muted-foreground">
              {t("shop.boosterHint")}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
