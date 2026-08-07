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
import {
  GameIconWell,
  GamePanel,
  type GamePanelTone,
} from "@/components/ui/game";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type NextGoalCardProps = {
  milestoneInput: MilestoneInput;
  coinsPerWin: number;
  /** When ready to buy — scroll/spotlight the matching upgrade card. */
  onFocusUpgrade?: (key: UpgradeKey) => void;
};

const GOAL_TONE: Record<UpgradeKey, GamePanelTone> = {
  STADIUM: "emerald",
  TRAINING_GROUND: "sky",
  MEDICAL: "rose",
};

const GOAL_BAR: Record<UpgradeKey, string> = {
  STADIUM: "from-emerald-400 to-lime-300",
  TRAINING_GROUND: "from-sky-400 to-cyan-300",
  MEDICAL: "from-rose-400 to-pink-300",
};

/**
 * Core-loop nudge: wins until the closest upgrade — Arena panel chrome.
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
      <GamePanel tone="amber" className="px-3 py-3">
        <div className="relative flex items-center gap-2.5">
          <GameIconWell size="sm" amber src="/icons/crown.png" />
          <p className="font-display text-sm font-black text-amber-100 drop-shadow-sm">
            {t("club.nextGoalMaxed")}
          </p>
        </div>
      </GamePanel>
    );
  }

  const name = locale === "fa" ? goal.faName : goal.name;
  const wins = winsAway(goal.remaining, coinsPerWin);
  const tone = GOAL_TONE[goal.key];
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
        className="block w-full text-start"
      >
        <GamePanel tone={tone} className="px-3 py-3">
          <div className="relative flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <GameIconWell
                size="lg"
                amber
                className="bg-accent/20 shadow-[0_0_0_1px_hsl(var(--accent)/0.55),0_3px_0_0_rgba(0,0,0,0.35)]"
              >
                <UpgradeIcon
                  upgradeKey={goal.key}
                  size="md"
                  className="h-9 w-9!"
                />
              </GameIconWell>
            </motion.div>

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

            <span className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-bubble bg-accent px-3 py-2 font-display text-[11px] font-black text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]">
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
        </GamePanel>
      </motion.button>
    );
  }

  return (
    <Link href="/play" className="block">
      <motion.div whileTap={{ scale: 0.98 }}>
        <GamePanel tone={tone} className="px-3 py-3">
          <div className="relative flex items-center gap-3">
            <GameIconWell size="lg">
              <UpgradeIcon
                upgradeKey={goal.key}
                size="md"
                className="h-9 w-9!"
              />
            </GameIconWell>

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
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                <motion.div
                  className={[
                    "h-full rounded-full bg-linear-to-r",
                    GOAL_BAR[goal.key],
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
        </GamePanel>
      </motion.div>
    </Link>
  );
}
