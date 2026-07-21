"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { resolveMatch, type ResolveMatchResult } from "@/actions/resolveMatch";
import type { KickSubmission } from "@/lib/quiz/scoring";
import { calculateLevel } from "@/lib/game/economy";
import { nextMilestone, winsAway } from "@/lib/club/milestones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { CountUp } from "./CountUp";

type MatchResultProps = {
  totalKicks: number;
  submissions: KickSubmission[];
  /** FTUE tutorial match — fixed payout, no "Play Again" (loop back to Hub). */
  tutorial?: boolean;
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
  onPlayAgain,
  onExit,
}: MatchResultProps) {
  const { t, locale } = useTranslation();
  const [save, setSave] = useState<SaveState>({ status: "saving" });

  // Guard against double-submit in React strict/dev double-invoke.
  const submittedRef = useRef(false);

  async function submit() {
    setSave({ status: "saving" });
    const result = await resolveMatch(submissions, { tutorial });
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
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("result.saving")}
          </h1>
        </div>
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
          <button
            type="button"
            onClick={() => void submit()}
            className="btn-fantasy btn-fantasy-primary w-full justify-center"
          >
            {t("common.retry")}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="btn-fantasy btn-fantasy-accent w-full justify-center"
          >
            {t("common.backToClub")}
          </button>
        </div>
      </section>
    );
  }

  // Saved — show server-confirmed rewards + new balances.
  const { rewards: confirmed, balances, level, levelUp, coinsPerWin } = save.data;
  const won = confirmed.won;
  const outOfEnergy = balances.stamina <= 0;
  // In the tutorial, funnel straight back to the Hub for the forced upgrade.
  const hidePlayAgain = tutorial || outOfEnergy;

  // Progress bar: fill from where the player was BEFORE this match's XP to the
  // new position. On a level-up we fill the fresh level from empty.
  const prevProgress = calculateLevel(balances.xp - confirmed.xp).progress;
  const barFrom = levelUp ? 0 : prevProgress;

  // Coins that came from an active Newspaper booster (final minus itemized base).
  const coinBase =
    confirmed.breakdown.coinsWin + confirmed.breakdown.coinsPerfectBonus;
  const boosterCoinBonus = Math.max(0, confirmed.coins - coinBase);

  // Itemized bonus lines (only the ones that actually fired).
  const bonusLines: { key: string; label: string; amount: number; unit: string }[] =
    [
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

  // Next Milestone — the upgrade the player is closest to affording. Drives the
  // goal-oriented "just one more win…" nudge. Hidden during the FTUE tutorial
  // (that flow already funnels straight into the forced first upgrade).
  const milestone = tutorial
    ? null
    : nextMilestone({
        coins: balances.coins,
        stadiumLevel: balances.stadiumLevel,
        medicalLevel: balances.medicalLevel,
        trainingGroundLevel: balances.trainingGroundLevel,
      });

  let milestoneText: string | null = null;
  if (milestone) {
    const name = locale === "fa" ? milestone.faName : milestone.name;
    if (milestone.affordable) {
      milestoneText = t("result.milestoneReady", { name });
    } else {
      const wins = winsAway(milestone.remaining, coinsPerWin);
      milestoneText =
        wins <= 1
          ? t("result.milestoneOneWin", { name })
          : t("result.milestoneBudget", {
              n: toLocaleDigits(milestone.remaining, locale),
              name,
            });
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 0.6 }}
        className="text-6xl"
        aria-hidden
      >
        {won ? "🏆" : "🧤"}
      </motion.div>

      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {won ? t("result.won") : t("result.lost")}
        </h1>
        <p className="mt-1 font-display text-lg font-semibold text-muted-foreground">
          {t("result.goalsScored", {
            goals: toLocaleDigits(confirmed.goals, locale),
            total: toLocaleDigits(totalKicks, locale),
          })}
        </p>
        <p
          className={[
            "mt-2 font-display text-sm font-bold",
            won ? "text-primary" : "text-accent-deep",
          ].join(" ")}
        >
          {won ? t("result.wonHint") : t("result.lostHint")}
        </p>
        {confirmed.combo >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.25 }}
            className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 font-display text-sm font-bold text-accent-deep"
          >
            🔥 {t("result.combo", { n: toLocaleDigits(confirmed.combo, locale) })}
          </motion.div>
        )}
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {[
          { label: t("result.coins"), amount: confirmed.coins, tone: "text-accent-deep" },
          { label: t("result.xp"), amount: confirmed.xp, tone: "text-primary" },
          { label: t("result.fans"), amount: confirmed.fans, tone: "text-secondary" },
        ].map((r) => {
          const earned = r.amount > 0;
          return (
            <div
              key={r.label}
              className={[
                "rounded-bubble border px-3 py-4 shadow-fantasy transition-colors",
                earned ? "border-border bg-surface" : "border-border bg-muted/50",
              ].join(" ")}
            >
              <p
                className={[
                  "font-display text-xl font-bold",
                  earned ? r.tone : "text-muted-foreground",
                ].join(" ")}
              >
                {earned ? (
                  <CountUp value={r.amount} locale={locale} prefix="+" delay={0.15} />
                ) : (
                  `+${toLocaleDigits(0, locale)}`
                )}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {r.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Itemized "how the math worked" lines */}
      {bonusLines.length > 0 && (
        <div className="w-full space-y-1">
          {bonusLines.map((line) => (
            <div
              key={line.key}
              className="flex items-center justify-between rounded-full bg-muted/60 px-3 py-1.5 text-xs font-semibold"
            >
              <span className="text-muted-foreground">{line.label}</span>
              <span className="font-display font-bold text-surface-foreground">
                +{toLocaleDigits(line.amount, locale)} {line.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Level + XP progress */}
      <div className="w-full rounded-bubble border border-border bg-surface p-4 shadow-fantasy">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold text-primary">
            {t("result.level", { n: toLocaleDigits(level.level, locale) })}
          </span>
          <span className="font-display text-xs font-semibold text-muted-foreground">
            {t("result.xpToGo", {
              cur: toLocaleDigits(level.currentLevelXp, locale),
              next: toLocaleDigits(level.nextLevelXp, locale),
            })}
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
            initial={{ width: `${Math.round(barFrom * 100)}%` }}
            animate={{ width: `${Math.round(level.progress * 100)}%` }}
            transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
          />
        </div>
        {levelUp && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.6 }}
            className="mt-3 flex flex-wrap items-center justify-center gap-x-2 rounded-bubble bg-accent/15 px-3 py-2 font-display text-sm font-bold text-accent-deep"
          >
            <span>🎉 {t("result.levelUp")}</span>
            <span className="text-muted-foreground">·</span>
            <span>
              {t("result.levelUpPerk", {
                coins: toLocaleDigits(levelUp.coinReward, locale),
              })}
            </span>
          </motion.div>
        )}
      </div>

      {/* Next Milestone — the psychological "almost there" nudge */}
      {milestone && milestoneText && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 20 }}
          className="w-full rounded-bubble border-2 border-accent/40 bg-accent/10 p-4 shadow-fantasy"
        >
          <div className="flex items-center gap-3 text-start">
            <span className="text-3xl" aria-hidden>
              {milestone.icon}
            </span>
            <div className="flex-1">
              <p className="font-display text-[0.7rem] font-bold uppercase tracking-widest text-accent-deep">
                {t("result.milestoneTitle")}
              </p>
              <p className="mt-0.5 font-display text-sm font-bold text-foreground">
                {milestoneText}
              </p>
            </div>
          </div>
          {!milestone.affordable && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-accent to-secondary"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    100,
                    Math.round((balances.coins / milestone.cost) * 100),
                  )}%`,
                }}
                transition={{ duration: 0.9, delay: 0.7, ease: "easeOut" }}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Server-confirmed club totals */}
      <div className="flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 font-display text-sm font-bold shadow-fantasy-sm">
        <span className="text-accent-deep">💰 {toLocaleDigits(balances.coins, locale)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-secondary">👥 {toLocaleDigits(balances.fans, locale)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-primary">
          ⚡ {toLocaleDigits(balances.stamina, locale)}/{toLocaleDigits(balances.maxStamina, locale)}
        </span>
      </div>

      <div className="flex w-full flex-col gap-3">
        {tutorial ? (
          <div className="w-full rounded-bubble border border-accent/40 bg-accent/10 px-4 py-3 text-center font-display text-sm font-bold text-accent-deep">
            {t("result.spendCoins")}
          </div>
        ) : outOfEnergy ? (
          <div className="w-full rounded-bubble border border-border bg-muted px-4 py-3 text-center font-display text-sm font-bold text-muted-foreground">
            {t("result.outOfEnergy")}
          </div>
        ) : (
          <button
            type="button"
            onClick={onPlayAgain}
            className="btn-fantasy btn-fantasy-primary w-full justify-center"
          >
            {t("result.playAgain")}
          </button>
        )}
        <button
          type="button"
          onClick={onExit}
          className={[
            "btn-fantasy w-full justify-center",
            hidePlayAgain ? "btn-fantasy-primary" : "btn-fantasy-accent",
          ].join(" ")}
        >
          {t("common.backToClub")}
        </button>
      </div>
    </motion.section>
  );
}
