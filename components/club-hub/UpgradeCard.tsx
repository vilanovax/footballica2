"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { UpgradeDef } from "@/lib/club/upgrades";
import { getUpgradeImpact } from "@/lib/club/upgradeEffects";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import { UpgradeIcon } from "@/components/club-hub/UpgradeIcon";

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
            "flex min-h-touch min-w-[5.5rem] flex-col items-center justify-center gap-0.5 font-display text-sm font-bold transition-all",
            isMax
              ? "bg-transparent px-0 py-0"
              : canAfford
                ? "rounded-bubble bg-primary/15 px-2.5 py-1.5 shadow-fantasy-sm active:scale-[0.97]"
                : "rounded-bubble bg-muted/60 px-2.5 py-1.5 opacity-55",
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
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/upgrade.png"
                alt=""
                aria-hidden
                draggable={false}
                className="h-9 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
              />
              <span
                className={[
                  "font-display text-xs font-black tabular-nums",
                  canAfford ? "text-accent-deep" : "text-destructive",
                ].join(" ")}
              >
                {toLocaleDigits(cost, locale)}
              </span>
            </>
          )}
        </motion.button>
      </motion.div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t(`upgrades.${def.key}.name`)}
        subtitle={`${t("stadium.lvl")} ${toLocaleDigits(level, locale)}`}
        closeLabel={t("common.close")}
      >
        <div className="mb-3 flex justify-center">
          <UpgradeIcon upgradeKey={def.key} size="lg" className="h-14 w-14!" />
        </div>
        <p className="font-body text-sm font-semibold leading-relaxed text-muted-foreground">
          {t(`upgrades.${def.key}.desc`)}
        </p>
        {impact && (
          <p className="mt-3 rounded-bubble border border-primary/30 bg-primary/10 px-3 py-2 font-display text-sm font-bold text-primary">
            {t(`upgrades.impact.${impact.kind}`, {
              from: toLocaleDigits(impact.from, locale),
              to: toLocaleDigits(impact.to, locale),
            })}
          </p>
        )}
        {!isMax && (
          <motion.button
            type="button"
            disabled={disabled}
            onClick={() => {
              setSheetOpen(false);
              onUpgrade();
            }}
            whileTap={disabled ? undefined : { y: 3 }}
            className={[
              "btn-fantasy mt-4 w-full",
              canAfford
                ? "btn-fantasy-primary"
                : "bg-muted text-muted-foreground opacity-60",
            ].join(" ")}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {canAfford ? (
                <>
                  {t("upgrades.upgrade")} ·
                  <ResourceIcon kind="coin" size="sm" />
                  {toLocaleDigits(cost!, locale)}
                </>
              ) : (
                <>
                  <ResourceIcon kind="coin" size="sm" />
                  {toLocaleDigits(cost ?? 0, locale)}
                </>
              )}
            </span>
          </motion.button>
        )}
      </BottomSheet>
    </>
  );
}
