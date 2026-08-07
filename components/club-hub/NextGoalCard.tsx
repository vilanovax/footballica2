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
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type NextGoalCardProps = {
  milestoneInput: MilestoneInput;
  coinsPerWin: number;
  /** When ready to buy — scroll/spotlight the matching upgrade card. */
  onFocusUpgrade?: (key: UpgradeKey) => void;
};

const GOAL_SKIN: Record<
  UpgradeKey,
  { row: string; rim: string; glow: string; bar: string }
> = {
  STADIUM: {
    row: "from-[#0f3d2e] via-[#145c45] to-[#0a281c]",
    rim: "border-emerald-400/50",
    glow: "bg-emerald-400/40",
    bar: "from-emerald-400 to-lime-300",
  },
  TRAINING_GROUND: {
    row: "from-[#0c2d4a] via-[#134e75] to-[#081f33]",
    rim: "border-sky-400/50",
    glow: "bg-sky-400/40",
    bar: "from-sky-400 to-cyan-300",
  },
  MEDICAL: {
    row: "from-[#3d1520] via-[#7a1f3d] to-[#2a0f16]",
    rim: "border-rose-400/50",
    glow: "bg-rose-400/40",
    bar: "from-rose-400 to-pink-300",
  },
};

/**
 * Core-loop nudge: wins until the closest upgrade — quest-objective HUD card.
 */
export function NextGoalCard({
  milestoneInput,
  coinsPerWin,
  onFocusUpgrade,
}: NextGoalCardProps) {
  const { t, locale } = useTranslation();
  const goal = nextMilestone(milestoneInput);

  if (!goal) {
    return (
      <div className="relative overflow-hidden rounded-bubble-xl border-[3px] border-amber-400/45 bg-linear-to-br from-[#3d2a08] via-[#7a5410] to-[#2a1c06] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.3)]">
        <div className="relative flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/crown.png"
            alt=""
            draggable={false}
            className="h-8 w-8 object-contain"
          />
          <p className="font-display text-sm font-black text-amber-100 drop-shadow-sm">
            {t("club.nextGoalMaxed")}
          </p>
        </div>
      </div>
    );
  }

  const name = locale === "fa" ? goal.faName : goal.name;
  const wins = winsAway(goal.remaining, coinsPerWin);
  const skin = GOAL_SKIN[goal.key];
  const saved = Math.max(0, goal.cost - goal.remaining);
  const progressPct = Math.min(
    100,
    Math.round((saved / Math.max(1, goal.cost)) * 100),
  );

  if (goal.affordable) {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          playSound("click");
          haptic(HAPTIC.tap);
          onFocusUpgrade?.(goal.key);
        }}
        className={[
          "relative w-full overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 text-start shadow-[0_5px_0_0_rgba(0,0,0,0.3)]",
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
          animate={{ opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <div className="relative flex items-center gap-3">
          <motion.span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-accent/60 bg-accent/15 shadow-[0_3px_0_0_rgba(0,0,0,0.4)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <UpgradeIcon upgradeKey={goal.key} size="md" className="h-9 w-9!" />
          </motion.span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-lime-300/90">
              {t("club.nextGoalReady")}
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
              {t("club.nextGoalBuy", { name })}
            </p>
            <p className="mt-1 font-display text-[11px] font-bold text-white/55">
              {t("club.nextGoalJump")}
            </p>
          </div>

          <span className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-bubble bg-accent px-3 py-2 font-display text-[11px] font-black text-accent-foreground shadow-[0_3px_0_0_rgba(0,0,0,0.4)]">
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
      </motion.button>
    );
  }

  return (
    <Link href="/play" className="block">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={[
          "relative overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.3)]",
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
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/25 bg-black/35 shadow-[0_3px_0_0_rgba(0,0,0,0.4)]">
            <UpgradeIcon upgradeKey={goal.key} size="md" className="h-9 w-9!" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
              {t("club.nextGoalLabel")}
            </p>
            <p className="mt-0.5 font-display text-sm font-black leading-snug text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
              {t("club.nextGoalWins", {
                n: toLocaleDigits(wins === Infinity ? 0 : wins, locale),
                name,
                coins: toLocaleDigits(goal.remaining, locale),
              })}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/10">
              <motion.div
                className={[
                  "h-full rounded-full bg-linear-to-r",
                  skin.bar,
                ].join(" ")}
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 24 }}
              />
            </div>
            <p className="mt-1.5 font-display text-[11px] font-bold text-lime-300">
              {t("club.nextGoalCta")}
            </p>
          </div>

          <ChevronRight
            className="h-5 w-5 shrink-0 text-white/50 rtl:rotate-180"
            aria-hidden
          />
        </div>
      </motion.div>
    </Link>
  );
}
