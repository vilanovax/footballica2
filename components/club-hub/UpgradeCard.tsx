"use client";

import { motion } from "framer-motion";
import type { UpgradeDef } from "@/lib/club/upgrades";

type UpgradeCardProps = {
  def: UpgradeDef;
  level: number;
  cost: number | null;
  canAfford: boolean;
  pending: boolean;
  onUpgrade: () => void;
};

export function UpgradeCard({
  def,
  level,
  cost,
  canAfford,
  pending,
  onUpgrade,
}: UpgradeCardProps) {
  const isMax = cost === null;
  const disabled = isMax || !canAfford || pending;

  return (
    <div className="flex items-center gap-3 rounded-bubble border border-border bg-surface p-3 shadow-fantasy">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-bubble bg-muted text-2xl">
        {def.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-display text-base font-bold text-surface-foreground">
            {def.name}
          </p>
          <span className="rounded-full bg-muted px-2 py-0.5 font-display text-[10px] font-bold uppercase text-muted-foreground">
            Lv. {level}
          </span>
        </div>
        <p className="truncate font-body text-xs font-semibold text-muted-foreground">
          {def.faName}
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
          <span>MAX</span>
        ) : pending ? (
          <span>…</span>
        ) : (
          <>
            <span>Upgrade</span>
            <span className="flex items-center gap-1 text-xs opacity-90">
              💰 {cost}
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
}
