"use client";

import { motion } from "framer-motion";
import type { UpgradeDef } from "@/lib/club/upgrades";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type UpgradeCardProps = {
  def: UpgradeDef;
  level: number;
  cost: number | null;
  canAfford: boolean;
  pending: boolean;
  /** FTUE: dim + block interaction while another card is spotlighted. */
  locked?: boolean;
  /** FTUE: raise above the mask + glowing pulse to guide the forced upgrade. */
  spotlight?: boolean;
  onUpgrade: () => void;
};

export function UpgradeCard({
  def,
  level,
  cost,
  canAfford,
  pending,
  locked = false,
  spotlight = false,
  onUpgrade,
}: UpgradeCardProps) {
  const { t, locale } = useTranslation();
  const isMax = cost === null;
  const disabled = isMax || !canAfford || pending || locked;
  // Highlight a buyable upgrade (unless the FTUE is spotlighting another card).
  const affordable = !isMax && canAfford && !locked;

  return (
    <motion.div
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
        "flex items-center gap-3 rounded-bubble border bg-surface p-3 shadow-fantasy transition-opacity",
        spotlight
          ? "relative z-50 border-accent"
          : affordable
            ? "border-primary/40"
            : "border-border",
        locked ? "pointer-events-none opacity-40" : "",
      ].join(" ")}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-bubble bg-muted text-2xl">
        {def.icon}
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
        <p className="truncate font-body text-xs font-semibold text-muted-foreground">
          {t(`upgrades.${def.key}.desc`)}
        </p>
      </div>

      <motion.button
        type="button"
        disabled={disabled}
        onClick={onUpgrade}
        whileTap={disabled ? undefined : { y: 4 }}
        className={[
          "flex min-h-touch min-w-[5.5rem] flex-col items-center justify-center rounded-bubble px-3 py-2 font-display text-sm font-bold transition-all",
          isMax
            ? "bg-muted text-muted-foreground"
            : canAfford
              ? "bg-primary text-primary-foreground shadow-btn-3d active:shadow-btn-3d-press"
              : "bg-muted text-muted-foreground opacity-50",
        ].join(" ")}
      >
        {isMax ? (
          <span>{t("upgrades.max")}</span>
        ) : pending ? (
          <span>…</span>
        ) : (
          <>
            <span>{t("upgrades.upgrade")}</span>
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
    </motion.div>
  );
}
