"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  buyUpgrade,
  buyBooster,
  purchaseCoinPack,
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
import {
  COIN_PACK_LIST,
  type CoinPackTier,
} from "@/lib/game/coinPacks";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { UpgradeCard } from "@/components/club-hub/UpgradeCard";

type ShopProps = {
  initialClub: ClubSnapshot;
  /** Costs sourced from GameConfig on the server. */
  boosterCosts: Record<BoosterShopType, number>;
  /** Deep-link from StatusBar coin "+" (`?tab=coins`). */
  initialTab?: Tab;
};

type Tab = "upgrades" | "boosters" | "coins";

/** Booster catalog (metadata only — cost + counts come from the server). */
const BOOSTERS: {
  type: BoosterShopType;
  icon: string;
  owned: (c: ClubSnapshot) => number;
}[] = [
  { type: "FIFTY_FIFTY", icon: "✂️", owned: (c) => c.boosterFiftyFifty },
  { type: "FREEZE_TIMER", icon: "❄️", owned: (c) => c.boosterFreezeTimer },
];

const TABS: Tab[] = ["upgrades", "boosters", "coins"];

export function Shop({
  initialClub,
  boosterCosts,
  initialTab = "upgrades",
}: ShopProps) {
  const { t, locale } = useTranslation();
  const [club, setClub] = useState(initialClub);
  const [tab, setTab] = useState<Tab>(
    TABS.includes(initialTab) ? initialTab : "upgrades",
  );
  const [pending, setPending] = useState<string | null>(null);
  const [coinPulse, setCoinPulse] = useState(0);
  const [, startTransition] = useTransition();

  function errorMessage(code: ShopErrorCode): string {
    switch (code) {
      case "insufficient":
        return t("shop.errInsufficient");
      case "maxed":
        return t("shop.errMax");
      case "already_full":
        return t("status.staminaAlreadyFull");
      case "rate_limited":
        return t("shop.errRateLimited");
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

  function buyPack(tier: CoinPackTier) {
    if (pending) return;
    setPending(tier);
    startTransition(async () => {
      const result = await purchaseCoinPack(tier);
      setPending(null);
      handleResult(
        result,
        t("shop.boughtPack", { name: t(`shop.packs.${tier}.name`) }),
      );
    });
  }

  function tabLabel(key: Tab): string {
    if (key === "upgrades") return t("shop.tabUpgrades");
    if (key === "boosters") return t("shop.tabBoosters");
    return t("shop.tabCoins");
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
      <div className="flex gap-1 rounded-bubble bg-muted/60 p-1">
        {TABS.map((key) => {
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
                "relative flex-1 rounded-bubble px-2 py-2 font-display text-xs font-bold transition-colors sm:text-sm",
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
              <span className="relative">{tabLabel(key)}</span>
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
          {tab === "upgrades" &&
            UPGRADE_LIST.map((def) => {
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
            })}

          {tab === "boosters" &&
            BOOSTERS.map((b) => {
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

          {tab === "coins" && (
            <>
              <p className="px-1 text-center font-body text-xs font-semibold text-muted-foreground">
                {t("shop.coinHint")}
              </p>
              {COIN_PACK_LIST.map((pack) => {
                const isPending = pending === pack.tier;
                return (
                  <motion.div
                    key={pack.tier}
                    whileHover={{ scale: 1.01 }}
                    className={[
                      "relative overflow-hidden rounded-bubble border-2 bg-surface p-4 shadow-fantasy",
                      pack.highlight
                        ? "border-accent bg-linear-to-br from-accent/15 to-surface"
                        : "border-accent/30",
                    ].join(" ")}
                  >
                    {pack.highlight && (
                      <span className="absolute end-3 top-3 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-wider text-accent-foreground">
                        {t("shop.bestValue")}
                      </span>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-bubble bg-accent/20 text-3xl shadow-fantasy-sm">
                        {pack.tier === "SMALL"
                          ? "🪙"
                          : pack.tier === "MEDIUM"
                            ? "💰"
                            : "🏆"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-bold text-foreground">
                          {t(`shop.packs.${pack.tier}.name`)}
                        </p>
                        <p className="font-display text-2xl font-black text-accent-deep tabular-nums">
                          +{toLocaleDigits(pack.coinsGranted, locale)}{" "}
                          <span className="text-sm font-bold text-muted-foreground">
                            {t("shop.coins")}
                          </span>
                        </p>
                        <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
                          {t(`shop.packs.${pack.tier}.desc`)}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      disabled={!!pending}
                      onClick={() => buyPack(pack.tier)}
                      whileTap={pending ? undefined : { y: 4 }}
                      className="mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-bubble bg-accent px-4 py-3 font-display text-base font-bold text-accent-foreground shadow-btn-3d active:shadow-btn-3d-press disabled:opacity-60"
                    >
                      {isPending ? (
                        "…"
                      ) : (
                        <>
                          <span>{t("shop.buyPack")}</span>
                          <span className="rounded-full bg-black/15 px-2 py-0.5 text-sm tabular-nums">
                            {toLocaleDigits(pack.price, locale)} {t("shop.currencyIrr")}
                          </span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
