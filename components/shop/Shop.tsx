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
import { ResourceIcon } from "@/components/common/ResourceIcon";

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

const TABS: { key: Tab; glyph: string }[] = [
  { key: "coins", glyph: "🪙" },
  { key: "boosters", glyph: "⚡" },
  { key: "upgrades", glyph: "🏟️" },
];

const PACK_ICON_SIZE: Record<CoinPackTier, "lg" | "xl"> = {
  SMALL: "lg",
  MEDIUM: "xl",
  LARGE: "xl",
};

const PACK_STACK: Record<CoinPackTier, number> = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
};

export function Shop({
  initialClub,
  boosterCosts,
  initialTab = "upgrades",
}: ShopProps) {
  const { t, locale } = useTranslation();
  const [club, setClub] = useState(initialClub);
  const [tab, setTab] = useState<Tab>(
    TABS.some((x) => x.key === initialTab) ? initialTab : "upgrades",
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
      {/* ── Vault hero ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-bubble-lg border-2 border-accent/50 bg-linear-to-br from-accent/35 via-primary/15 to-secondary/20 px-4 pb-5 pt-3 shadow-fantasy-lg"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-accent/30 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-6 bottom-0 h-28 w-28 rounded-full bg-primary/25 blur-2xl"
        />

        <div className="relative flex items-center justify-between gap-2">
          <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent-deep">
            {t("shop.eyebrow")}
          </p>
          <Link
            href="/club"
            onClick={() => playSound("click")}
            className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-border/70 bg-surface/85 px-3 font-display text-xs font-bold text-muted-foreground shadow-fantasy-sm backdrop-blur-sm active:scale-95"
          >
            {t("common.back")}
          </Link>
        </div>

        <div className="relative mt-3 flex flex-col items-center gap-1">
          <motion.div
            key={coinPulse}
            animate={
              coinPulse
                ? { y: [0, -10, 0], scale: [1, 1.18, 1], rotate: [0, -8, 6, 0] }
                : { y: [0, -4, 0] }
            }
            transition={
              coinPulse
                ? { duration: 0.55 }
                : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            }
            className="drop-shadow-[0_6px_12px_rgba(234,179,8,0.45)]"
          >
            <ResourceIcon kind="coin" size="xl" className="h-16 w-16!" />
          </motion.div>

          <p className="font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            {t("shop.budget")}
          </p>
          <motion.p
            key={`bal-${coinPulse}`}
            initial={coinPulse ? { scale: 1.2, color: "var(--accent)" } : false}
            animate={{ scale: 1 }}
            className="font-display text-4xl font-black tabular-nums leading-none text-accent-deep"
          >
            {toLocaleDigits(club.coins, locale)}
          </motion.p>
          <h1 className="mt-1 font-display text-base font-bold text-foreground/90">
            {t("shop.title")}
          </h1>
        </div>
      </motion.header>

      {/* ── Mode tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1.5 rounded-bubble-lg border border-border/60 bg-surface/80 p-1.5 shadow-fantasy-sm">
        {TABS.map(({ key, glyph }) => {
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
                "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-bubble px-1 py-1.5 font-display transition-colors",
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
              <span className="relative text-base leading-none" aria-hidden>
                {key === "coins" ? (
                  <ResourceIcon kind="coin" size="sm" className="h-5 w-5" />
                ) : (
                  glyph
                )}
              </span>
              <span className="relative text-[11px] font-extrabold sm:text-xs">
                {tabLabel(key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ────────────────────────────────────────── */}
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
                  maxStamina={club.maxStamina}
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
                    "flex items-center gap-3 rounded-bubble-lg border-2 px-3 py-3 shadow-fantasy",
                    canAfford
                      ? "border-secondary/45 bg-linear-to-br from-secondary/15 via-surface to-primary/10"
                      : "border-border bg-muted/30",
                  ].join(" ")}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface text-3xl shadow-fantasy-sm">
                    {b.icon}
                  </div>

                  <div className="min-w-0 flex-1 text-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-bold text-foreground">
                        {t(`shop.boosters.${b.type}.name`)}
                      </p>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-extrabold text-primary">
                        {t("shop.owned", {
                          n: toLocaleDigits(b.owned(club), locale),
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
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
                            "mt-0.5 inline-flex items-center gap-1 text-xs",
                            canAfford
                              ? "opacity-90"
                              : "font-bold text-destructive",
                          ].join(" ")}
                        >
                          <ResourceIcon kind="coin" size="sm" />
                          {toLocaleDigits(cost, locale)}
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
              <p className="px-1 text-center font-display text-xs font-bold text-muted-foreground">
                {t("shop.coinHint")}
              </p>
              {COIN_PACK_LIST.map((pack, i) => {
                const isPending = pending === pack.tier;
                const stack = PACK_STACK[pack.tier];
                return (
                  <motion.div
                    key={pack.tier}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 280, damping: 20 }}
                    className={[
                      "relative overflow-hidden rounded-bubble-lg border-2 px-4 py-4 shadow-fantasy",
                      pack.highlight
                        ? "border-accent bg-linear-to-br from-accent/30 via-accent/10 to-primary/10"
                        : "border-accent/35 bg-linear-to-br from-accent/10 via-surface to-primary/5",
                    ].join(" ")}
                  >
                    {pack.highlight && (
                      <span className="absolute start-3 top-3 rounded-full bg-accent px-2.5 py-0.5 font-display text-[10px] font-black uppercase tracking-wider text-accent-foreground shadow-fantasy-sm">
                        {t("shop.bestValue")}
                      </span>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <div className="relative flex h-16 w-20 shrink-0 items-center justify-center">
                        {Array.from({ length: stack }).map((_, si) => (
                          <motion.div
                            key={si}
                            className="absolute"
                            style={{
                              insetInlineStart: `${si * 10}px`,
                              zIndex: stack - si,
                            }}
                            animate={{ y: [0, -3 - si, 0] }}
                            transition={{
                              duration: 1.8 + si * 0.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: si * 0.12,
                            }}
                          >
                            <ResourceIcon
                              kind="coin"
                              size={PACK_ICON_SIZE[pack.tier]}
                              className={
                                pack.tier === "LARGE"
                                  ? "h-14 w-14!"
                                  : undefined
                              }
                            />
                          </motion.div>
                        ))}
                      </div>

                      <div className="min-w-0 flex-1 text-start">
                        <p className="font-display text-sm font-extrabold text-muted-foreground">
                          {t(`shop.packs.${pack.tier}.name`)}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5 font-display font-black tabular-nums leading-none text-accent-deep">
                          <span className="text-3xl">
                            +{toLocaleDigits(pack.coinsGranted, locale)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground">
                            <ResourceIcon kind="coin" size="sm" />
                            {t("shop.coins")}
                          </span>
                        </p>
                        <p className="mt-1 font-body text-xs font-semibold text-muted-foreground">
                          {t(`shop.packs.${pack.tier}.desc`)}
                        </p>
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      disabled={!!pending}
                      onClick={() => buyPack(pack.tier)}
                      whileTap={pending ? undefined : { y: 4 }}
                      className="btn-fantasy btn-fantasy-accent mt-4 w-full justify-center gap-2 disabled:opacity-60"
                    >
                      {isPending ? (
                        "…"
                      ) : (
                        <>
                          <span>{t("shop.buyPack")}</span>
                          <span className="rounded-full bg-black/15 px-2.5 py-0.5 text-sm tabular-nums">
                            {toLocaleDigits(pack.price, locale)}{" "}
                            {t("shop.currencyIrr")}
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
