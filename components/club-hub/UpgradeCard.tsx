"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
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

const UPGRADE_SKIN: Record<
  UpgradeKey,
  { hero: string; row: string; glow: string; pip: string; rim: string }
> = {
  STADIUM: {
    hero: "from-[#0d3b2e] via-[#145c45] to-[#1a7a55]",
    row: "from-[#0f3d2e] via-[#145c45] to-[#0a281c]",
    glow: "bg-emerald-400/40",
    pip: "bg-emerald-400",
    rim: "border-emerald-400/45",
  },
  TRAINING_GROUND: {
    hero: "from-[#0c2d4a] via-[#134e75] to-[#1d6fa5]",
    row: "from-[#0c2d4a] via-[#134e75] to-[#081f33]",
    glow: "bg-sky-400/40",
    pip: "bg-sky-400",
    rim: "border-sky-400/45",
  },
  MEDICAL: {
    hero: "from-[#3d1520] via-[#7a1f3d] to-[#b91c4a]",
    row: "from-[#3d1520] via-[#7a1f3d] to-[#2a0f16]",
    glow: "bg-rose-400/40",
    pip: "bg-rose-400",
    rim: "border-rose-400/45",
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
  const skin = UPGRADE_SKIN[def.key];

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
          "relative cursor-pointer overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
          spotlight ? "z-50 border-accent" : skin.rim,
          locked ? "pointer-events-none opacity-45" : "",
        ].join(" ")}
      >
        <div
          className={["absolute inset-0 bg-linear-to-br", skin.row].join(" ")}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
          aria-hidden
        />
        {affordable && (
          <motion.div
            aria-hidden
            className={[
              "pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full blur-2xl",
              skin.glow,
            ].join(" ")}
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        )}

        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white/25 bg-black/30 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
              <UpgradeIcon upgradeKey={def.key} size="md" className="h-9 w-9!" />
            </span>
            <span className="absolute -bottom-1 -start-1 rounded-full bg-black/55 px-1.5 py-0.5 font-display text-[9px] font-black text-white ring-1 ring-white/25">
              Lv{toLocaleDigits(level, locale)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-display text-sm font-black text-white drop-shadow-sm">
                {t(`upgrades.${def.key}.name`)}
              </p>
              {isMax && (
                <span className="rounded-full bg-amber-400/30 px-2 py-0.5 font-display text-[10px] font-black text-amber-100 ring-1 ring-amber-300/50">
                  MAX
                </span>
              )}
            </div>
            {impact ? (
              <p className="mt-1 truncate font-display text-[11px] font-bold text-lime-300">
                {t(`upgrades.impact.${impact.kind}`, {
                  from: toLocaleDigits(impact.from, locale),
                  to: toLocaleDigits(impact.to, locale),
                })}
              </p>
            ) : (
              <p className="mt-1 truncate font-display text-[11px] font-bold text-white/55">
                {t("upgrades.max")}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isMax ? (
              <span className="rounded-full bg-amber-400/25 px-2.5 py-1.5 font-display text-[11px] font-black text-amber-100 ring-1 ring-amber-300/40">
                👑 MAX
              </span>
            ) : (
              <motion.button
                type="button"
                data-upgrade-buy
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpgrade();
                }}
                whileTap={disabled ? undefined : { y: 2 }}
                aria-label={`${t("upgrades.upgrade")} ${toLocaleDigits(cost ?? 0, locale)}`}
                className={[
                  "inline-flex min-h-9 items-center gap-1 rounded-bubble px-2.5 py-1.5 font-display text-[11px] font-black shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
                  canAfford && !pending && !locked
                    ? "bg-accent text-accent-foreground"
                    : "cursor-not-allowed bg-white/15 text-white/55",
                ].join(" ")}
              >
                {pending ? (
                  "…"
                ) : (
                  <>
                    <span>{t("upgrades.upgrade")}</span>
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-0.5 tabular-nums"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/coin.png"
                        alt=""
                        aria-hidden
                        className="h-3.5 w-3.5"
                      />
                      {toLocaleDigits(cost, locale)}
                    </span>
                  </>
                )}
              </motion.button>
            )}
            <ChevronRight
              className="h-4 w-4 text-white/45 rtl:rotate-180"
              aria-hidden
            />
          </div>
        </div>
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
            "relative -mx-1 overflow-hidden rounded-bubble-xl border border-white/15 bg-linear-to-br shadow-[0_8px_0_0_rgba(0,0,0,0.35)]",
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
