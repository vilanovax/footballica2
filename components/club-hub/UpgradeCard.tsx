"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { UpgradeDef, UpgradeKey } from "@/lib/club/upgrades";
import {
  fansSoftCap,
  getUpgradeImpact,
} from "@/lib/club/upgradeEffects";
import { staminaRegenIntervalMinutes } from "@/lib/club/stamina";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { UpgradeIcon } from "@/components/club-hub/UpgradeIcon";

const UPGRADE_HERO: Record<
  UpgradeKey,
  { hero: string; glow: string; pip: string }
> = {
  STADIUM: {
    hero: "from-[#0d3b2e] via-[#145c45] to-[#1a7a55]",
    glow: "bg-emerald-400/40",
    pip: "bg-emerald-400",
  },
  TRAINING_GROUND: {
    hero: "from-[#0c2d4a] via-[#134e75] to-[#1d6fa5]",
    glow: "bg-sky-400/40",
    pip: "bg-sky-400",
  },
  MEDICAL: {
    hero: "from-[#3d1520] via-[#7a1f3d] to-[#b91c4a]",
    glow: "bg-rose-400/40",
    pip: "bg-rose-400",
  },
};

type UpgradeCardProps = {
  def: UpgradeDef;
  level: number;
  maxStamina: number;
  cost: number | null;
  canAfford: boolean;
  pending: boolean;
  locked?: boolean;
  spotlight?: boolean;
  onUpgrade: () => void;
};

export function UpgradeCard({
  def,
  level,
  maxStamina,
  cost,
  canAfford,
  pending,
  locked = false,
  spotlight = false,
  onUpgrade,
}: UpgradeCardProps) {
  const { t, locale } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMax = cost === null;
  const disabled = isMax || !canAfford || pending || locked;
  const affordable = !isMax && canAfford && !locked;
  const impact = isMax
    ? null
    : getUpgradeImpact(def.key, level, maxStamina);
  const skin = UPGRADE_HERO[def.key];

  /** Big hero number — current live effect of this track. */
  const heroValue =
    def.key === "STADIUM"
      ? fansSoftCap(level)
      : def.key === "TRAINING_GROUND"
        ? maxStamina
        : staminaRegenIntervalMinutes(level);
  const heroLabelKey =
    def.key === "STADIUM"
      ? "upgrades.heroFansCap"
      : def.key === "TRAINING_GROUND"
        ? "upgrades.heroMaxEnergy"
        : "upgrades.heroRegen";
  const heroHintKey =
    def.key === "STADIUM"
      ? "upgrades.heroHintStadium"
      : def.key === "TRAINING_GROUND"
        ? "upgrades.heroHintTraining"
        : "upgrades.heroHintMedical";

  function openDetails(e: React.MouseEvent) {
    // Don't steal the upgrade button tap.
    if ((e.target as HTMLElement).closest("[data-upgrade-buy]")) return;
    if (locked) return;
    haptic(HAPTIC.light);
    playSound("click");
    setSheetOpen(true);
  }

  return (
    <>
      <motion.div
        role="button"
        tabIndex={locked ? -1 : 0}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetails(e as unknown as React.MouseEvent);
          }
        }}
        animate={
          spotlight
            ? {
                boxShadow: [
                  "0 0 0px hsl(var(--accent) / 0)",
                  "0 0 22px 4px hsl(var(--accent) / 0.85)",
                  "0 0 0px hsl(var(--accent) / 0)",
                ],
              }
            : undefined
        }
        transition={spotlight ? { repeat: Infinity, duration: 1.6 } : undefined}
        className={[
          "flex cursor-pointer items-center gap-3 rounded-bubble border bg-surface p-3 shadow-fantasy transition-opacity",
          spotlight
            ? "relative z-50 border-accent"
            : affordable
              ? "border-primary/40"
              : "border-border",
          locked ? "pointer-events-none opacity-40" : "",
        ].join(" ")}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-bubble bg-muted">
          <UpgradeIcon upgradeKey={def.key} size="md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-base font-bold text-surface-foreground">
              {t(`upgrades.${def.key}.name`)}
            </p>
            <span className="rounded-full bg-muted px-2 py-0.5 font-display text-[10px] font-bold uppercase text-muted-foreground">
              {t("stadium.lvl")} {toLocaleDigits(level, locale)}
            </span>
          </div>
          {impact ? (
            <p className="mt-0.5 font-display text-xs font-bold text-primary">
              {t(`upgrades.impact.${impact.kind}`, {
                from: toLocaleDigits(impact.from, locale),
                to: toLocaleDigits(impact.to, locale),
              })}
            </p>
          ) : (
            <p className="mt-0.5 font-display text-xs font-bold text-muted-foreground">
              {t("upgrades.max")}
            </p>
          )}
        </div>

        <motion.button
          type="button"
          data-upgrade-buy
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onUpgrade();
          }}
          whileTap={disabled || isMax ? undefined : { y: 4 }}
          aria-label={
            isMax
              ? t("upgrades.max")
              : `${t("upgrades.upgrade")} ${toLocaleDigits(cost ?? 0, locale)}`
          }
          className={[
            "flex min-h-touch items-center justify-center font-display font-bold transition-all active:scale-[0.97]",
            isMax ? "px-0 py-0" : "gap-1.5 px-1 py-1",
            !isMax && !canAfford ? "opacity-55" : "",
          ].join(" ")}
        >
          {isMax ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/icons/max.png"
              alt={t("upgrades.max")}
              draggable={false}
              className="h-9 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
            />
          ) : pending ? (
            <span>…</span>
          ) : (
            <span dir="ltr" className="inline-flex items-center gap-1.5">
              <span
                className={[
                  "font-display text-sm font-black tabular-nums",
                  canAfford ? "text-accent-deep" : "text-destructive",
                ].join(" ")}
              >
                {toLocaleDigits(cost, locale)}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/upgrade.png"
                alt=""
                aria-hidden
                draggable={false}
                className="h-9 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
              />
            </span>
          )}
        </motion.button>
      </motion.div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t(`upgrades.${def.key}.name`)}
        subtitle={t("upgrades.levelOf", {
          n: toLocaleDigits(level, locale),
          max: toLocaleDigits(def.maxLevel, locale),
        })}
        closeLabel={t("common.close")}
        tone="dark"
      >
        {/* Hero — one big live stat */}
        <div
          className={[
            "relative -mx-1 overflow-hidden rounded-bubble-xl border border-white/15 bg-gradient-to-br shadow-[0_8px_0_0_rgba(0,0,0,0.35)]",
            skin.hero,
          ].join(" ")}
        >
          <div
            className={[
              "pointer-events-none absolute -end-10 -top-8 h-36 w-36 rounded-full blur-3xl",
              skin.glow,
            ].join(" ")}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-14deg, transparent, transparent 14px, #fff 14px, #fff 15px)",
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
            <motion.span
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-black/30 shadow-[0_0_36px_rgba(255,255,255,0.18)]"
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
              aria-hidden
            >
              <UpgradeIcon
                upgradeKey={def.key}
                size="lg"
                className="h-12 w-12!"
              />
            </motion.span>

            <div className="mt-2.5 flex items-center gap-1">
              {Array.from({ length: def.maxLevel }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "h-2 w-2 rounded-full border border-white/30",
                    i < level ? skin.pip : "bg-white/10",
                  ].join(" ")}
                  aria-hidden
                />
              ))}
            </div>

            <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-widest text-white/55">
              {t(heroLabelKey)}
            </p>
            <motion.p
              key={heroValue}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              dir="ltr"
              className="font-display text-5xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]"
            >
              {toLocaleDigits(heroValue, locale)}
              {def.key === "MEDICAL" && (
                <span className="ms-1 text-2xl font-black text-white/70">
                  {locale === "fa" ? "د" : "m"}
                </span>
              )}
            </motion.p>
            <p className="mt-1 max-w-[16rem] text-center font-display text-xs font-bold text-white/75">
              {t(heroHintKey)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-center font-display text-xs font-bold text-white/55">
          {t(`upgrades.${def.key}.desc`)}
        </p>

        {/* Upgrade offer — bank style */}
        {!isMax && cost != null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-4 overflow-hidden rounded-bubble-xl border-2 border-accent bg-gradient-to-br from-accent/30 via-[#2a1f08] to-[#12100a] p-1 shadow-[0_6px_0_0_hsl(var(--accent-deep))]"
          >
            <div className="rounded-[1.1rem] bg-gradient-to-b from-black/20 to-black/50 px-3.5 pb-3.5 pt-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
                  aria-hidden
                >
                  ⬆
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[10px] font-black uppercase tracking-widest text-accent">
                    {t("upgrades.nextLevel")}
                  </p>
                  <p className="font-display text-lg font-black text-white">
                    {t("stadium.lvl")}{" "}
                    {toLocaleDigits(level + 1, locale)}
                  </p>
                  {impact && (
                    <p className="mt-0.5 font-display text-sm font-bold text-lime-300">
                      {t(`upgrades.impact.${impact.kind}`, {
                        from: toLocaleDigits(impact.from, locale),
                        to: toLocaleDigits(impact.to, locale),
                      })}
                    </p>
                  )}
                </div>
              </div>

              <motion.button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSheetOpen(false);
                  onUpgrade();
                }}
                whileTap={disabled ? undefined : { y: 3 }}
                className={[
                  "mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-bubble-xl px-4 font-display text-base font-black",
                  canAfford && !pending && !locked
                    ? "bg-accent text-accent-foreground shadow-[0_5px_0_0_hsl(var(--accent-deep))]"
                    : "cursor-not-allowed border-2 border-white/15 bg-white/10 text-white/55",
                ].join(" ")}
              >
                {canAfford && !locked ? (
                  <>
                    <span>{t("upgrades.upgrade")}</span>
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm"
                    >
                      🪙 {toLocaleDigits(cost, locale)}
                    </span>
                  </>
                ) : (
                  t("upgrades.needCoins", {
                    n: toLocaleDigits(cost, locale),
                  })
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {isMax && (
          <div className="mt-4 rounded-bubble-xl border-2 border-amber-400/50 bg-amber-500/15 px-3 py-3 text-center">
            <p className="font-display text-base font-black text-amber-300">
              👑 {t("upgrades.max")}
            </p>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
