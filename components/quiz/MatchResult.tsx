"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { resolveMatch, type ResolveMatchResult } from "@/actions/resolveMatch";
import type { KickSubmission, MatchRewards } from "@/lib/quiz/scoring";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type MatchResultProps = {
  rewards: MatchRewards;
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
  rewards,
  totalKicks,
  submissions,
  tutorial = false,
  onPlayAgain,
  onExit,
}: MatchResultProps) {
  const { t, locale } = useTranslation();
  const won = rewards.goals > totalKicks / 2;
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
  const { rewards: confirmed, balances } = save.data;
  const outOfEnergy = balances.stamina <= 0;
  // In the tutorial, funnel straight back to the Hub for the forced upgrade.
  const hidePlayAgain = tutorial || outOfEnergy;

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
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
                +{toLocaleDigits(r.amount, locale)}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {r.label}
              </p>
            </div>
          );
        })}
      </div>

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
