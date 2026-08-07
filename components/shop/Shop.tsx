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

const TABS: { key: Tab; iconSrc?: string; glyph?: string }[] = [
  { key: "coins", iconSrc: "/icons/coin.png" },
  { key: "boosters", iconSrc: "/icons/energy.png" },
  { key: "upgrades", iconSrc: "/icons/upgrade.png" },
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
      handleResult(
        result,
        t("shop.boughtUpgrade", { name: t(`upgrades.${key}.name`) }),
      );
    });
  }

  function purchaseBooster(type: BoosterShopType) {
    if (pending) return;
    setPending(type);
    startTransition(async () => {
      const result = await buyBooster(type);
      setPending(null);
      handleResult(
        result,
        t("shop.boughtBooster", { name: t(`shop.boosters.${type}.name`) }),
      );
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
    <section className="flex flex-1 flex-col gap-3.5 pb-2">
      {/* ── Vault hero ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-bubble-xl bg-linear-to-br from-[#5c3d0a] via-[#0f172a] to-[#052e16] px-3.5 pb-4 pt-3 shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_5px_0_0_rgba(0,0,0,0.32)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-amber-300/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-6 bottom-0 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl"
        />

        <div className="relative flex items-center justify-between gap-2">
          <p className="font-display text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/85">
            {t("shop.eyebrow")}
          </p>
          <Link
            href="/club"
            onClick={() => playSound("click")}
            className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl bg-black/40 px-3 font-display text-xs font-black text-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_3px_0_0_rgba(0,0,0,0.35)] transition-transform active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/back.png"
              alt=""
              aria-hidden
              draggable={false}
              className="h-4 w-4 object-contain opacity-90"
            />
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
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/40 shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_4px_0_0_rgba(0,0,0,0.35)]"
          >
            <ResourceIcon kind="coin" size="xl" className="h-12 w-12!" />
          </motion.div>

          <p className="mt-1 font-display text-[11px] font-black uppercase tracking-widest text-white/50">
            {t("shop.budget")}
          </p>
          <motion.p
            key={`bal-${coinPulse}`}
            initial={coinPulse ? { scale: 1.15 } : false}
            animate={{ scale: 1 }}
            className="font-display text-4xl font-black tabular-nums leading-none text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
          >
            {toLocaleDigits(club.coins, locale)}
          </motion.p>
          <h1 className="mt-1 font-display text-base font-black text-white">
            {t("shop.title")}
          </h1>
        </div>
      </motion.header>

      {/* ── Mode tabs ──────────────────────────────────────────── */}
      <div className="relative grid grid-cols-3 gap-1 rounded-2xl bg-black/40 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        {TABS.map(({ key, iconSrc, glyph }) => {
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
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 font-display transition-colors",
                active ? "text-white" : "text-white/50",
              ].join(" ")}
            >
              {active && (
                <motion.span
                  layoutId="shop-tab"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-linear-to-b from-emerald-600/90 to-emerald-900/95 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_2px_0_0_rgba(0,0,0,0.35)]"
                />
              )}
              <span className="relative flex h-5 items-center justify-center" aria-hidden>
                {iconSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconSrc}
                    alt=""
                    draggable={false}
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  glyph
                )}
              </span>
              <span className="relative text-[11px] font-black sm:text-xs">
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
          className="flex flex-col gap-2.5"
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
                    "relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-3",
                    canAfford
                      ? "bg-linear-to-br from-[#052e16] via-[#0f172a] to-[#022c22] shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_4px_0_0_rgba(0,0,0,0.3)]"
                      : "bg-black/35 opacity-80 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_3px_0_0_rgba(0,0,0,0.25)]",
                  ].join(" ")}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(-16deg, transparent, transparent 10px, #fff 10px, #fff 11px)",
                    }}
                    aria-hidden
                  />
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/40 text-3xl shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_3px_0_0_rgba(0,0,0,0.35)]">
                    {b.icon}
                  </div>

                  <div className="relative min-w-0 flex-1 text-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-black text-white">
                        {t(`shop.boosters.${b.type}.name`)}
                      </p>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-display text-[10px] font-black text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]">
                        {t("shop.owned", {
                          n: toLocaleDigits(b.owned(club), locale),
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 font-display text-xs font-bold text-white/50">
                      {t(`shop.boosters.${b.type}.desc`)}
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    disabled={disabled}
                    onClick={() => purchaseBooster(b.type)}
                    whileTap={disabled ? undefined : { y: 2 }}
                    className={[
                      "relative flex min-h-12 min-w-22 flex-col items-center justify-center rounded-2xl border-2 px-3 py-2 font-display text-sm font-black transition-transform",
                      canAfford
                        ? "border-emerald-400/45 bg-linear-to-b from-emerald-500 to-emerald-800 text-white shadow-[0_3px_0_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(0,0,0,0.4)]"
                        : "border-white/10 bg-white/10 text-white/45",
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
                            canAfford ? "text-emerald-100" : "text-rose-300",
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
            <p className="px-1 pt-1 text-center font-display text-xs font-bold text-white/45">
              {t("shop.boosterHint")}
            </p>
          )}

          {tab === "coins" && (
            <>
              <p className="px-1 text-center font-display text-xs font-black text-white/45">
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
                    transition={{
                      delay: i * 0.06,
                      type: "spring",
                      stiffness: 280,
                      damping: 20,
                    }}
                    className={[
                      "relative overflow-hidden rounded-2xl px-3.5 py-3.5",
                      pack.highlight
                        ? "bg-linear-to-br from-[#5c3d0a] via-[#9a6b12]/40 to-[#0f172a] shadow-[0_0_0_1px_rgba(251,191,36,0.5),0_0_22px_rgba(251,191,36,0.18),0_4px_0_0_rgba(0,0,0,0.3)]"
                        : "bg-linear-to-br from-[#3d2a08] via-[#0f172a] to-[#2a1c06] shadow-[0_0_0_1px_rgba(251,191,36,0.3),0_4px_0_0_rgba(0,0,0,0.3)]",
                    ].join(" ")}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.05]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(-16deg, transparent, transparent 10px, #fff 10px, #fff 11px)",
                      }}
                      aria-hidden
                    />
                    {pack.highlight && (
                      <span className="absolute start-3 top-3 rounded-full bg-accent px-2.5 py-0.5 font-display text-[10px] font-black uppercase tracking-wider text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.3)]">
                        {t("shop.bestValue")}
                      </span>
                    )}

                    <div className="relative flex items-center gap-3 pt-1">
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
                        <p className="font-display text-sm font-black text-white/55">
                          {t(`shop.packs.${pack.tier}.name`)}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5 font-display font-black tabular-nums leading-none text-amber-300">
                          <span className="text-3xl">
                            +{toLocaleDigits(pack.coinsGranted, locale)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-white/50">
                            <ResourceIcon kind="coin" size="sm" />
                            {t("shop.coins")}
                          </span>
                        </p>
                        <p className="mt-1 font-display text-xs font-bold text-white/45">
                          {t(`shop.packs.${pack.tier}.desc`)}
                        </p>
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      disabled={!!pending}
                      onClick={() => buyPack(pack.tier)}
                      whileTap={pending ? undefined : { y: 2 }}
                      className="relative mt-3.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-300/45 bg-linear-to-b from-accent to-[hsl(38_92%_42%)] font-display text-sm font-black text-accent-foreground shadow-[0_4px_0_0_rgba(120,70,0,0.5)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(120,70,0,0.5)] disabled:opacity-60"
                    >
                      {isPending ? (
                        "…"
                      ) : (
                        <>
                          <span>{t("shop.buyPack")}</span>
                          <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-sm tabular-nums">
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
