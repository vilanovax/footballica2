"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  nextMilestone,
  winsAway,
  type MilestoneInput,
} from "@/lib/club/milestones";
import type { UpgradeKey } from "@/lib/club/upgrades";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { UpgradeIcon } from "@/components/club-hub/UpgradeIcon";

type NextGoalCardProps = {
  milestoneInput: MilestoneInput;
  coinsPerWin: number;
};

const GOAL_SKIN: Record<
  UpgradeKey,
  { row: string; rim: string; glow: string }
> = {
  STADIUM: {
    row: "from-[#0f3d2e] via-[#145c45] to-[#0a281c]",
    rim: "border-emerald-400/45",
    glow: "bg-emerald-400/35",
  },
  TRAINING_GROUND: {
    row: "from-[#0c2d4a] via-[#134e75] to-[#081f33]",
    rim: "border-sky-400/45",
    glow: "bg-sky-400/35",
  },
  MEDICAL: {
    row: "from-[#3d1520] via-[#7a1f3d] to-[#2a0f16]",
    rim: "border-rose-400/45",
    glow: "bg-rose-400/35",
  },
};

/**
 * Core-loop nudge: how many typical wins until the closest upgrade is affordable.
 * Matches Club Business card chrome (dark row + compact CTA).
 */
export function NextGoalCard({
  milestoneInput,
  coinsPerWin,
}: NextGoalCardProps) {
  const { t, locale } = useTranslation();
  const goal = nextMilestone(milestoneInput);

  if (!goal) {
    return (
      <div className="relative overflow-hidden rounded-bubble-xl border-[3px] border-amber-400/40 bg-linear-to-br from-[#3d2a08] via-[#7a5410] to-[#2a1c06] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]">
        <p className="relative font-display text-sm font-black text-amber-100">
          👑 {t("club.nextGoalMaxed")}
        </p>
      </div>
    );
  }

  const name = locale === "fa" ? goal.faName : goal.name;
  const wins = winsAway(goal.remaining, coinsPerWin);
  const skin = GOAL_SKIN[goal.key];

  if (goal.affordable) {
    return (
      <div
        className={[
          "relative overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
          skin.rim,
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
        <motion.div
          aria-hidden
          className={[
            "pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full blur-2xl",
            skin.glow,
          ].join(" ")}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/25 bg-black/30 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            <UpgradeIcon upgradeKey={goal.key} size="md" className="h-9 w-9!" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-black uppercase tracking-widest text-white/55">
              {t("club.nextGoalReady")}
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-black text-white drop-shadow-sm">
              {t("club.nextGoalBuy", { name })}
            </p>
          </div>

          <span className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-bubble bg-accent px-2.5 py-1.5 font-display text-[11px] font-black text-accent-foreground shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/coin.png"
              alt=""
              aria-hidden
              className="h-3.5 w-3.5"
            />
            <span dir="ltr" className="tabular-nums">
              {toLocaleDigits(goal.cost, locale)}
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link href="/play" className="block">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={[
          "relative overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
          skin.rim,
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

        <div className="relative flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/25 bg-black/30 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            <UpgradeIcon upgradeKey={goal.key} size="md" className="h-9 w-9!" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-black uppercase tracking-widest text-white/55">
              {t("club.nextGoalLabel")}
            </p>
            <p className="mt-0.5 font-display text-sm font-black leading-snug text-white drop-shadow-sm">
              {t("club.nextGoalWins", {
                n: toLocaleDigits(wins === Infinity ? 0 : wins, locale),
                name,
                coins: toLocaleDigits(goal.remaining, locale),
              })}
            </p>
            <p className="mt-1 font-display text-[11px] font-bold text-lime-300">
              {t("club.nextGoalCta")}
            </p>
          </div>

          <ChevronRight
            className="h-4 w-4 shrink-0 text-white/45 rtl:rotate-180"
            aria-hidden
          />
        </div>
      </motion.div>
    </Link>
  );
}
