"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  resolveMatch,
  type ResolveMatchResult,
  type MatchModeOption,
} from "@/actions/resolveMatch";
import type { KickSubmission } from "@/lib/quiz/scoring";
import type { HelperKey } from "@/lib/game/helpers";
import { calculateLevel } from "@/lib/game/economy";
import { nextMilestone, winsAway } from "@/lib/club/milestones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { PostMatchSummary } from "@/components/match/PostMatchSummary";
import { GameCta } from "@/components/ui/game";

type MatchResultProps = {
  totalKicks: number;
  submissions: KickSubmission[];
  /** FTUE tutorial match — fixed payout, no "Play Again" (loop back to Hub). */
  tutorial?: boolean;
  /** Whether any help (50/50, freeze, superpower) was used — gates "no help" badges. */
  usedHelp?: boolean;
  /** In-match coin helpers used, in order — settled (coin cost) server-side. */
  helpersUsed?: HelperKey[];
  /** Core mode — logged server-side and drives the win/lose headline copy. */
  mode?: MatchModeOption;
  onPlayAgain: () => void;
  onExit: () => void;
};

type SaveState =
  | { status: "saving" }
  | { status: "saved"; data: Extract<ResolveMatchResult, { ok: true }> }
  | { status: "error"; message: string };

export function MatchResult({
  totalKicks,
  submissions,
  tutorial = false,
  usedHelp = false,
  helpersUsed = [],
  mode = "penalty",
  onPlayAgain,
  onExit,
}: MatchResultProps) {
  const { t, locale } = useTranslation();
  const [save, setSave] = useState<SaveState>({ status: "saving" });
  const submittedRef = useRef(false);

  async function submit() {
    setSave({ status: "saving" });
    const result = await resolveMatch(submissions, {
      tutorial,
      usedHelp: usedHelp || helpersUsed.length > 0,
      helpersUsed,
      mode,
    });
    if (result.ok) {
      setSave({ status: "saved", data: result });
    } else {
      setSave({ status: "error", message: result.error });
    }
  }

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (save.status === "saving") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          className="text-6xl"
          aria-hidden
        >
          ⚽️
        </motion.div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t("result.saving")}
        </h1>
      </section>
    );
  }

  if (save.status === "error") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="text-6xl" aria-hidden>
          📡
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-destructive">
            {t("result.saveFailed")}
          </h1>
          <p className="mt-1 max-w-xs font-body text-sm font-semibold text-muted-foreground">
            {save.message}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <GameCta
            variant="primary"
            block
            onClick={() => void submit()}
            className="font-display text-base font-black"
          >
            {t("common.retry")}
          </GameCta>
          <GameCta
            variant="accent"
            block
            onClick={onExit}
            className="font-display text-base font-black"
          >
            {t("common.backToClub")}
          </GameCta>
        </div>
      </section>
    );
  }

  const {
    rewards: confirmed,
    balances,
    level,
    levelUp,
    coinsPerWin,
    unlockedBadges,
    streak,
    missions,
    businessBoostGranted,
    businessBoostBonus,
  } = save.data;
  const won = confirmed.won;
  const outOfEnergy = balances.stamina <= 0;
  const hidePlayAgain = tutorial || outOfEnergy;

  const prevProgress = calculateLevel(balances.xp - confirmed.xp).progress;
  const barFrom = levelUp ? 0 : prevProgress;

  const coinBase =
    confirmed.breakdown.coinsWin +
    confirmed.breakdown.coinsPerfectBonus +
    confirmed.breakdown.comboCoinBonus;
  const boosterCoinBonus = Math.max(0, confirmed.coins - coinBase);

  const bonusLines = [
    {
      key: "correct",
      label: t("result.correctAnswers", {
        n: toLocaleDigits(confirmed.goals, locale),
      }),
      amount: confirmed.breakdown.xpFromGoals,
      unit: "XP",
    },
    {
      key: "winxp",
      label: t("result.winBonus"),
      amount: confirmed.breakdown.xpWinBonus,
      unit: "XP",
    },
    {
      key: "perfect",
      label: t("result.perfectBonus"),
      amount: confirmed.breakdown.coinsPerfectBonus,
      unit: "💰",
    },
    {
      key: "comboxp",
      label: t("result.comboBonus"),
      amount: confirmed.breakdown.comboXpBonus,
      unit: "XP",
    },
    {
      key: "combocoin",
      label: t("result.comboBonus"),
      amount: confirmed.breakdown.comboCoinBonus,
      unit: "💰",
    },
    {
      key: "booster",
      label: t("result.boosterBonus"),
      amount: boosterCoinBonus,
      unit: "💰",
    },
  ].filter((l) => l.amount > 0);

  const milestone = tutorial
    ? null
    : nextMilestone({
        coins: balances.coins,
        stadiumLevel: balances.stadiumLevel,
        medicalLevel: balances.medicalLevel,
        trainingGroundLevel: balances.trainingGroundLevel,
      });

  let milestoneBody: string | null = null;
  if (milestone) {
    const name = locale === "fa" ? milestone.faName : milestone.name;
    if (milestone.affordable) {
      milestoneBody = t("result.milestoneReady", { name });
    } else {
      const wins = winsAway(milestone.remaining, coinsPerWin);
      milestoneBody =
        wins <= 1
          ? t("result.milestoneOneWin", { name })
          : t("result.milestoneBudget", {
              n: toLocaleDigits(milestone.remaining, locale),
              name,
            });
    }
  }

  const title =
    mode === "quick"
      ? won
        ? t("result.wonQuick")
        : t("result.lostQuick")
      : won
        ? t("result.won")
        : t("result.lost");

  const chips = [
    confirmed.combo >= 2
      ? {
          key: "combo",
          label: t("result.combo", {
            n: toLocaleDigits(confirmed.combo, locale),
          }),
          tone: "accent" as const,
          iconSrc: "/icons/streak.png",
        }
      : null,
    streak.dailyStreak >= 1
      ? {
          key: "streak",
          label: t("result.streakDays", {
            n: toLocaleDigits(streak.dailyStreak, locale),
          }),
          tone: "secondary" as const,
          iconSrc: "/icons/streak.png",
        }
      : null,
    businessBoostGranted
      ? {
          key: "bizboost",
          label: t("result.businessBoost", {
            pct: toLocaleDigits(Math.round(businessBoostBonus * 100), locale),
          }),
          tone: "accent" as const,
          iconSrc: "/icons/upgrade.png",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    tone: "accent" | "secondary";
    iconSrc?: string;
  }>;

  const streakNote = streak.extended
    ? streak.dailyStreak > 1
      ? t("result.streakExtended", {
          n: toLocaleDigits(streak.dailyStreak, locale),
        })
      : t("result.streakStarted")
    : null;

  return (
    <PostMatchSummary
      outcome={{
        emoji: won ? "🏆" : "🧤",
        heroSrc: won ? "/icons/trophy.png" : "/icons/broken-heart.png",
        title,
        subtitle: t("result.goalsScored", {
          goals: toLocaleDigits(confirmed.goals, locale),
          total: toLocaleDigits(totalKicks, locale),
        }),
        hint: won ? t("result.wonHint") : t("result.lostHint"),
        hintTone: won ? "positive" : "negative",
        chips,
      }}
      rewards={{
        coins: confirmed.coins,
        xp: confirmed.xp,
        fans: confirmed.fans,
        bonusLines,
        balances: {
          coins: balances.coins,
          fans: balances.fans,
          stamina: balances.stamina,
          maxStamina: balances.maxStamina,
        },
      }}
      achievements={{
        level: {
          level: level.level,
          currentLevelXp: level.currentLevelXp,
          nextLevelXp: level.nextLevelXp,
          progress: level.progress,
          barFrom,
          levelUp,
        },
        badges: unlockedBadges,
        missions,
        streakNote,
        milestone:
          milestone && milestoneBody
            ? {
                icon: milestone.icon,
                eyebrow: t("result.milestoneTitle"),
                body: milestoneBody,
                fill: milestone.affordable
                  ? undefined
                  : Math.min(1, balances.coins / milestone.cost),
              }
            : null,
      }}
      ctas={{
        notice: tutorial
          ? t("result.spendCoins")
          : outOfEnergy
            ? t("result.outOfEnergy")
            : null,
        primary: hidePlayAgain
          ? null
          : {
              label: t("result.playAgain"),
              onClick: onPlayAgain,
              variant: "primary",
            },
        secondary: {
          label: t("common.backToClub"),
          onClick: onExit,
          variant: hidePlayAgain ? "primary" : "accent",
        },
      }}
    />
  );
}
