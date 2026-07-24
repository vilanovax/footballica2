"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  nextMilestone,
  winsAway,
  type MilestoneInput,
} from "@/lib/club/milestones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type NextGoalCardProps = {
  milestoneInput: MilestoneInput;
  coinsPerWin: number;
};

/**
 * Core-loop nudge: how many typical wins until the closest upgrade is affordable.
 */
export function NextGoalCard({
  milestoneInput,
  coinsPerWin,
}: NextGoalCardProps) {
  const { t, locale } = useTranslation();
  const goal = nextMilestone(milestoneInput);

  if (!goal) {
    return (
      <div className="rounded-bubble-lg border border-accent/40 bg-accent/10 px-4 py-3 shadow-fantasy-sm">
        <p className="font-display text-sm font-bold text-accent-deep">
          {t("club.nextGoalMaxed")}
        </p>
      </div>
    );
  }

  const name = locale === "fa" ? goal.faName : goal.name;
  const wins = winsAway(goal.remaining, coinsPerWin);

  if (goal.affordable) {
    return (
      <div className="rounded-bubble-lg border-2 border-primary bg-primary/10 px-4 py-3 shadow-fantasy">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-primary">
          {t("club.nextGoalReady")}
        </p>
        <p className="mt-1 font-display text-base font-bold text-foreground">
          {goal.icon} {t("club.nextGoalBuy", { name })}
        </p>
        <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
          💰 {toLocaleDigits(goal.cost, locale)}
        </p>
      </div>
    );
  }

  return (
    <Link href="/play" className="block">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="rounded-bubble-lg border-2 border-secondary/50 bg-secondary/10 px-4 py-3 shadow-fantasy"
      >
        <p className="font-display text-xs font-bold uppercase tracking-widest text-secondary">
          {t("club.nextGoalLabel")}
        </p>
        <p className="mt-1 font-display text-base font-bold leading-snug text-foreground">
          {t("club.nextGoalWins", {
            n: toLocaleDigits(wins === Infinity ? 0 : wins, locale),
            name,
            coins: toLocaleDigits(goal.remaining, locale),
          })}
        </p>
        <p className="mt-1 font-body text-xs font-semibold text-muted-foreground">
          {t("club.nextGoalCta")}
        </p>
      </motion.div>
    </Link>
  );
}
