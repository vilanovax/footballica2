"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  settleSurvival,
  type SettleSurvivalResult,
} from "@/actions/match/settleSurvival";
import type { KickSubmission } from "@/lib/quiz/scoring";
import type { SurvivalEndReason } from "@/lib/game/survival";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { CountUp } from "@/components/quiz/CountUp";

type SurvivalResultProps = {
  categoryId: string;
  endReason: SurvivalEndReason;
  submissions: KickSubmission[];
  challengeId?: string | null;
  onPlayAgain: () => void;
  onExit: () => void;
};

type SaveState =
  | { status: "saving" }
  | { status: "saved"; data: Extract<SettleSurvivalResult, { ok: true }> }
  | { status: "error"; message: string };

export function SurvivalResult({
  categoryId,
  endReason,
  submissions,
  challengeId = null,
  onPlayAgain,
  onExit,
}: SurvivalResultProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [save, setSave] = useState<SaveState>({ status: "saving" });
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    void (async () => {
      const result = await settleSurvival({
        categoryId,
        submissions,
        endReason,
        challengeId,
      });
      if (result.ok) {
        setSave({ status: "saved", data: result });
        router.refresh();
      } else {
        setSave({ status: "error", message: result.error });
      }
    })();
  }, [categoryId, endReason, submissions, challengeId, router]);

  if (save.status === "saving") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          className="text-6xl"
          aria-hidden
        >
          ❤️
        </motion.div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t("result.saving")}
        </h1>
      </section>
    );
  }

  if (save.status === "error") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-lg font-bold text-destructive">
          {t("survival.settleError")}
        </p>
        <p className="text-sm text-muted-foreground">{save.message}</p>
        <button type="button" onClick={onExit} className="btn-fantasy btn-fantasy-primary">
          {t("survival.backLobby")}
        </button>
      </section>
    );
  }

  const { data } = save;
  const cleared = data.rewards.endReason === "cleared";
  const catName = locale === "fa" ? data.category.nameFa : data.category.nameEn;

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="text-6xl"
        aria-hidden
      >
        {cleared ? "🏆" : "💔"}
      </motion.div>

      <div>
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-secondary">
          {data.category.icon || "📚"} {catName}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
          {cleared ? t("survival.clearedTitle") : t("survival.eliminatedTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {cleared ? t("survival.clearedBody") : t("survival.eliminatedBody")}
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="rounded-bubble-lg border border-border bg-surface p-4 shadow-fantasy-sm">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("survival.score")}
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-primary">
            <CountUp value={data.rewards.score} locale={locale} />
          </p>
        </div>
        <div className="rounded-bubble-lg border border-border bg-surface p-4 shadow-fantasy-sm">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("survival.bestCombo")}
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-accent-deep">
            ×{toLocaleDigits(data.rewards.bestCombo, locale)}
          </p>
        </div>
      </div>

      {data.isNewRecord && (
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-full bg-accent/20 px-4 py-2 font-display text-sm font-bold text-accent-deep"
        >
          {t("survival.newRecord", {
            n: toLocaleDigits(data.rewards.score, locale),
          })}
        </motion.p>
      )}

      {data.challenge?.conquered && (
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-full bg-secondary/20 px-4 py-2 font-display text-sm font-bold text-secondary"
        >
          {t("survival.challengeConquered", {
            n: toLocaleDigits(data.challenge.targetScore, locale),
          })}
          {data.challenge.badgeGranted && data.challenge.badgeSlug
            ? ` · 🏅 ${data.challenge.badgeSlug}`
            : ""}
        </motion.p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-2 rounded-bubble-lg border border-border bg-muted/40 p-4 text-sm">
        <div className="flex justify-between font-display font-bold">
          <span>🪙 {t("result.coins")}</span>
          <span>+{toLocaleDigits(data.rewards.coins, locale)}</span>
        </div>
        <div className="flex justify-between font-display font-bold">
          <span>⭐ {t("result.xp")}</span>
          <span>+{toLocaleDigits(data.rewards.xp, locale)}</span>
        </div>
        <div className="flex justify-between font-display font-bold">
          <span>📣 {t("result.fans")}</span>
          <span>+{toLocaleDigits(data.rewards.fans, locale)}</span>
        </div>
        {!data.isNewRecord && data.previousRecord > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("survival.recordHint", {
              n: toLocaleDigits(data.previousRecord, locale),
            })}
          </p>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="btn-fantasy btn-fantasy-primary w-full"
        >
          {t("survival.playAgain")}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="btn-fantasy btn-fantasy-secondary w-full"
        >
          {t("survival.backLobby")}
        </button>
      </div>
    </section>
  );
}
