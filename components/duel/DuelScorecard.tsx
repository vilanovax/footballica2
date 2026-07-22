"use client";

import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import {
  clubAccentRingStyle,
  clubAccentWashStyle,
  getClubColor,
} from "@/lib/onboarding/clubColors";
import type {
  ScorecardAnswer,
  ScorecardData,
  ScorecardMatchStatus,
  ScorecardOutcome,
  ScorecardRound,
} from "@/lib/duel/scorecardTypes";

type DuelScorecardProps = {
  data: ScorecardData;
  onPrimaryAction?: () => void;
  /** Show a secondary action (e.g. share / rematch). */
  onSecondaryAction?: () => void;
};

/**
 * Quiz-of-Kings style async PvP scorecard — pure presentation.
 * Feed with `toScorecard(duel)` from live `DuelSnapshot` data.
 */
export function DuelScorecard({
  data,
  onPrimaryAction,
  onSecondaryAction,
}: DuelScorecardProps) {
  const { t, locale } = useTranslation();
  const {
    status,
    outcome,
    you,
    them,
    youScore,
    themScore,
    rounds,
    ctaLabel,
  } = data;

  const primaryLabel =
    ctaLabel ??
    (status === "YOUR_TURN"
      ? t("duel.scorecard.playRound")
      : status === "WAITING"
        ? t("duel.scorecard.waitingCta")
        : t("duel.scorecard.rematch"));

  const secondaryLabel = t("duel.backLobby");

  return (
    <section className="relative flex flex-1 flex-col gap-4 pb-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        style={clubAccentWashStyle(you.colorKey)}
      />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative overflow-hidden rounded-bubble-xl border-2 border-border bg-surface px-3 py-5 shadow-fantasy-lg"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={clubAccentWashStyle(you.colorKey)}
        />

        <OutcomeBanner status={status} outcome={outcome} />

        <div className="relative mt-3 flex items-center justify-between gap-2">
          <PlayerBlock
            player={you}
            you
            muted={status === "COMPLETED" && outcome === "LOSE"}
          />
          <div className="flex shrink-0 flex-col items-center px-1">
            <p className="font-display text-3xl font-black tabular-nums tracking-tight text-foreground">
              {toLocaleDigits(youScore, locale)}
              <span className="mx-1.5 text-muted-foreground">–</span>
              {toLocaleDigits(themScore, locale)}
            </p>
            <span className="mt-1 rounded-full bg-secondary/15 px-2.5 py-0.5 font-display text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
              VS
            </span>
          </div>
          <PlayerBlock
            player={them}
            muted={status === "COMPLETED" && outcome === "WIN"}
          />
        </div>
      </motion.header>

      {/* Round board */}
      <div className="relative flex flex-col gap-3">
        <p className="px-1 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("duel.scorecard.board")}
        </p>
        {rounds.map((round, i) => (
          <RoundRow key={round.roundNumber} round={round} index={i} />
        ))}
      </div>

      {/* Footer CTAs */}
      <motion.footer
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-auto flex flex-col gap-2.5 pt-2"
      >
        {status === "WAITING" ? (
          <div className="rounded-bubble-lg border-2 border-dashed border-border bg-muted/40 px-4 py-4 text-center">
            <p className="font-display text-base font-bold text-muted-foreground">
              {t("duel.scorecard.waitingTitle")}
            </p>
            <p className="mt-1 font-body text-xs font-semibold text-muted-foreground">
              {t("duel.summaryAutoRefresh")}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="btn-fantasy btn-fantasy-primary w-full justify-center text-base"
          >
            {primaryLabel}
          </button>
        )}

        {(status === "COMPLETED" || status === "WAITING") && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className={[
              "w-full justify-center min-h-touch rounded-bubble border-2 px-5 py-3 font-display text-sm font-bold transition-transform active:scale-[0.98]",
              status === "COMPLETED"
                ? "border-accent/50 bg-accent/15 text-accent-deep"
                : "border-border bg-surface text-muted-foreground",
            ].join(" ")}
          >
            {secondaryLabel}
          </button>
        )}
      </motion.footer>
    </section>
  );
}

function OutcomeBanner({
  status,
  outcome,
}: {
  status: ScorecardMatchStatus;
  outcome: ScorecardOutcome;
}) {
  const { t } = useTranslation();
  if (status !== "COMPLETED" || !outcome) return null;

  const copy =
    outcome === "WIN"
      ? t("duel.resultWin")
      : outcome === "DRAW"
        ? t("duel.resultDraw")
        : t("duel.resultLose");
  const emoji = outcome === "WIN" ? "🏆" : outcome === "DRAW" ? "🤝" : "🧤";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative mb-1 flex flex-col items-center gap-1"
    >
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <p className="font-display text-xl font-black text-foreground">{copy}</p>
    </motion.div>
  );
}

function PlayerBlock({
  player,
  you,
  muted,
}: {
  player: ScorecardData["you"];
  you?: boolean;
  /** Grayscale loser avatar on completed matches. */
  muted?: boolean;
}) {
  const ringStyle =
    muted || !you
      ? undefined
      : clubAccentRingStyle(player.colorKey);
  const themAccent = !you && player.colorKey ? getClubColor(player.colorKey) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div
        className="relative rounded-full"
        style={
          ringStyle ??
          (themAccent && !muted
            ? { boxShadow: `0 0 0 3px ${themAccent.hex}66` }
            : undefined)
        }
      >
        <AvatarImage
          avatarKey={player.avatarKey}
          colorKey={player.colorKey}
          muted={muted}
          className={[
            "h-18 w-18 rounded-full shadow-fantasy",
            muted ? "opacity-80" : "",
            !you && !player.colorKey && !muted ? "ring-4 ring-border" : "",
            muted ? "ring-4 ring-border" : "",
          ].join(" ")}
        />
        <span className="absolute -bottom-1 left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full bg-accent px-1.5 font-display text-[11px] font-black text-accent-foreground shadow-sm ring-2 ring-surface">
          {player.level}
        </span>
        {player.isBot && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-sm shadow ring-2 ring-border">
            🤖
          </span>
        )}
      </div>
      <p
        className={[
          "max-w-26 truncate font-display text-xs font-bold",
          muted ? "text-muted-foreground" : "text-surface-foreground",
        ].join(" ")}
      >
        {player.name}
      </p>
    </div>
  );
}

function RoundRow({ round, index }: { round: ScorecardRound; index: number }) {
  const { t, locale } = useTranslation();
  const cat =
    locale === "fa" ? round.categoryNameFa : round.categoryNameEn;

  if (round.locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 * index }}
        className="rounded-bubble-lg border border-dashed border-border/80 bg-muted/30 px-3 py-5 text-center"
      >
        <p className="font-display text-sm font-bold text-muted-foreground">
          {t("duel.scorecard.roundLocked", {
            n: toLocaleDigits(round.roundNumber, locale),
          })}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, type: "spring", stiffness: 280, damping: 22 }}
      className="rounded-bubble-lg border-2 border-border bg-surface px-3 py-3.5 shadow-fantasy"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <AnswerStrip answers={round.youAnswers} align="end" />

        <div className="flex min-w-0 max-w-22 flex-col items-center gap-0.5 px-0.5 text-center">
          <span className="font-display text-[10px] font-bold text-secondary">
            {t("duel.scorecard.round", {
              n: toLocaleDigits(round.roundNumber, locale),
            })}
          </span>
          <span className="truncate font-display text-xs font-bold leading-tight text-surface-foreground">
            {cat}
          </span>
          {!round.waitingOnThem && (
            <span className="font-display text-[10px] font-bold tabular-nums text-muted-foreground">
              {toLocaleDigits(countCorrect(round.youAnswers), locale)}–
              {toLocaleDigits(countCorrect(round.themAnswers), locale)}
            </span>
          )}
        </div>

        <div className="flex justify-start">
          {round.waitingOnThem ? (
            <span className="rounded-full bg-muted px-2.5 py-1.5 text-center font-display text-[11px] font-bold leading-tight text-muted-foreground">
              {t("duel.scorecard.theirTurn")}
            </span>
          ) : (
            <AnswerStrip answers={round.themAnswers} align="start" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AnswerStrip({
  answers,
  align,
}: {
  answers: ScorecardAnswer[];
  align: "start" | "end";
}) {
  return (
    <div
      className={[
        "flex flex-nowrap items-center gap-1",
        align === "end" ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      {answers.map((a, i) => (
        <AnswerPip key={i} value={a} delay={i * 0.04} />
      ))}
    </div>
  );
}

function AnswerPip({
  value,
  delay,
}: {
  value: ScorecardAnswer;
  delay: number;
}) {
  if (value === true) {
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay, type: "spring", stiffness: 420, damping: 16 }}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] shadow-[0_2px_0_0_hsl(var(--primary-deep))] ring-1 ring-primary/30"
        title="Goal"
        aria-label="Correct"
      >
        ⚽️
      </motion.span>
    );
  }
  if (value === false) {
    return (
      <motion.span
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay, type: "spring", stiffness: 420, damping: 16 }}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-destructive-foreground shadow-[0_2px_0_0_hsl(0_70%_35%)] ring-1 ring-destructive/30"
        title="Miss"
        aria-label="Incorrect"
      >
        🟥
      </motion.span>
    );
  }
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted/50"
      aria-label="Empty"
    />
  );
}

function countCorrect(answers: ScorecardAnswer[]): number {
  return answers.filter((a) => a === true).length;
}
