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
import {
  GameCta,
  GameIconWell,
  GameOffer,
  GamePanel,
  GameTile,
  type GamePanelTone,
} from "@/components/ui/game";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { UpgradeIcon } from "@/components/club-hub/UpgradeIcon";

const UPGRADE_PANEL_TONE: Record<UpgradeKey, GamePanelTone> = {
  STADIUM: "emerald",
  TRAINING_GROUND: "sky",
  MEDICAL: "rose",
};

const UPGRADE_SKIN: Record<
  UpgradeKey,
  { row: string; glow: string; pip: string; rim: string }
> = {
  STADIUM: {
    row: "from-[#0f3d2e] via-[#145c45] to-[#0a281c]",
    glow: "bg-emerald-400/40",
    pip: "bg-emerald-400",
    rim: "border-emerald-400/45",
  },
  TRAINING_GROUND: {
    row: "from-[#0c2d4a] via-[#134e75] to-[#081f33]",
    glow: "bg-sky-400/40",
    pip: "bg-sky-400",
    rim: "border-sky-400/45",
  },
  MEDICAL: {
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
  /** Anchor for Next Goal scroll-into-view. */
  id?: string;
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
  id,
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
        id={id}
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
          "relative cursor-pointer overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 shadow-[0_6px_0_0_rgba(0,0,0,0.32)] scroll-mt-24",
          spotlight
            ? "z-50 border-accent"
            : affordable
              ? `${skin.rim} ring-1 ring-accent/25`
              : skin.rim,
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
              "pointer-events-none absolute -end-8 top-0 h-28 w-28 rounded-full blur-2xl",
              skin.glow,
            ].join(" ")}
            animate={{ opacity: [0.3, 0.65, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}

        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span
              className={[
                "flex h-14 w-14 items-center justify-center rounded-2xl border-2 shadow-[0_3px_0_0_rgba(0,0,0,0.4)]",
                affordable
                  ? "border-accent/70 bg-accent/15"
                  : "border-white/25 bg-black/35",
              ].join(" ")}
            >
              <UpgradeIcon upgradeKey={def.key} size="md" className="h-9 w-9!" />
            </span>
            <span className="absolute -bottom-1 -start-1 rounded-full bg-black/65 px-1.5 py-0.5 font-display text-[9px] font-black text-white ring-1 ring-white/30">
              Lv{toLocaleDigits(level, locale)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-display text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                {t(`upgrades.${def.key}.name`)}
              </p>
              {isMax && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2 py-0.5 font-display text-[10px] font-black text-amber-100 ring-1 ring-amber-300/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/crown.png"
                    alt=""
                    draggable={false}
                    className="h-3 w-3 object-contain"
                  />
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
            <div className="mt-1.5 flex items-center gap-1">
              {Array.from({ length: def.maxLevel }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "h-1.5 flex-1 rounded-full",
                    i < level
                      ? skin.pip
                      : i === level && !isMax
                        ? "bg-white/25 ring-1 ring-white/30"
                        : "bg-white/10",
                  ].join(" ")}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isMax ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-2.5 py-1.5 font-display text-[11px] font-black text-amber-100 ring-1 ring-amber-300/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/crown.png"
                  alt=""
                  draggable={false}
                  className="h-3.5 w-3.5 object-contain"
                />
                MAX
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
                animate={
                  affordable
                    ? { scale: [1, 1.04, 1] }
                    : undefined
                }
                transition={
                  affordable
                    ? { duration: 1.4, repeat: Infinity }
                    : undefined
                }
                aria-label={`${t("upgrades.upgrade")} ${toLocaleDigits(cost ?? 0, locale)}`}
                className={[
                  "inline-flex min-h-11 items-center gap-1 rounded-bubble px-3 py-2 font-display text-[11px] font-black shadow-[0_3px_0_0_rgba(0,0,0,0.4)]",
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
        <GamePanel
          className="-mx-1"
          tone={UPGRADE_PANEL_TONE[def.key]}
        >
          <div
            className={[
              "pointer-events-none absolute -inset-e-10 -top-8 h-36 w-36 rounded-full blur-3xl",
              skin.glow,
            ].join(" ")}
            aria-hidden
          />

          <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
            >
              <GameIconWell size="xl" amber>
                <UpgradeIcon
                  upgradeKey={def.key}
                  size="lg"
                  className="h-12 w-12!"
                />
              </GameIconWell>
            </motion.div>

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
            <p className="mt-1 max-w-64 text-center font-display text-xs font-bold text-white/75">
              {t(heroHintKey)}
            </p>
          </div>
        </GamePanel>

        <p className="mt-3 text-center font-display text-xs font-bold text-white/55">
          {t(`upgrades.${def.key}.desc`)}
        </p>

        {!isMax && cost != null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <GameOffer>
              <div className="flex items-center gap-3">
                <GameIconWell
                  size="md"
                  src="/icons/upgrade.png"
                  className="h-12 w-12 bg-accent shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
                  iconClassName="h-7 w-7"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[10px] font-black uppercase tracking-widest text-accent">
                    {t("upgrades.nextLevel")}
                  </p>
                  <p className="font-display text-lg font-black text-white">
                    {t("stadium.lvl")} {toLocaleDigits(level + 1, locale)}
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

              <GameCta
                variant="accent"
                block
                className="mt-3"
                disabled={disabled}
                onClick={() => {
                  setSheetOpen(false);
                  onUpgrade();
                }}
              >
                {canAfford && !locked ? (
                  <>
                    <span>{t("upgrades.upgrade")}</span>
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm"
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
                ) : (
                  t("upgrades.needCoins", {
                    n: toLocaleDigits(cost, locale),
                  })
                )}
              </GameCta>
            </GameOffer>
          </motion.div>
        )}

        {isMax && (
          <GameTile
            tone="amber"
            className="mt-4 flex items-center justify-center gap-2 px-3 py-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/crown.png"
              alt=""
              draggable={false}
              className="h-6 w-6 object-contain"
            />
            <p className="font-display text-base font-black text-amber-300">
              {t("upgrades.max")}
            </p>
          </GameTile>
        )}
      </BottomSheet>
    </>
  );
}
