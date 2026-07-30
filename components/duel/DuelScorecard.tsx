"use client";

import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import {
  clubAccentRingStyle,
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
  /** When embedded in PostMatchSummary, omit sticky CTAs. */
  hideFooter?: boolean;
  /** Parent already shows Win/Lose — skip the inner banner. */
  hideOutcomeBanner?: boolean;
};

/**
 * Quiz-of-Kings style async PvP scorecard — arena presentation.
 * Feed with `toScorecard(duel)` from live `DuelSnapshot` data.
 */
export function DuelScorecard({
  data,
  onPrimaryAction,
  onSecondaryAction,
  hideFooter = false,
  hideOutcomeBanner = false,
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
  const statusCopy =
    status === "YOUR_TURN"
      ? t("duel.yourTurn")
      : status === "WAITING"
        ? t("duel.scorecard.waitingTitle")
        : t("duel.finished");

  return (
    <section className="relative flex min-h-[min(100%,34rem)] flex-1 flex-col overflow-hidden rounded-bubble-xl">
      {/* Arena atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-[#1a2433] via-[#121820] to-[#0c1218]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-emerald-500/18 to-transparent" />
        <div className="absolute -inset-s-16 top-1/4 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -inset-e-14 bottom-1/5 h-44 w-44 rounded-full bg-secondary/20 blur-3xl" />
        <div
          className="absolute inset-x-8 top-[38%] h-24 -translate-y-1/2 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 14px, #fff 14px 15px)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-4 px-2.5 py-4">
        {/* Live status */}
        <div className="flex justify-center">
          <StatusBadge status={status} label={statusCopy} />
        </div>

        {/* Scoreboard */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-3 py-5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-white/8 to-transparent"
          />

          {!hideOutcomeBanner && (
            <OutcomeBanner status={status} outcome={outcome} />
          )}

          <div className="relative mt-1 flex items-center justify-between gap-2">
            <PlayerBlock
              player={you}
              you
              muted={status === "COMPLETED" && outcome === "LOSE"}
            />
            <div className="flex shrink-0 flex-col items-center px-1">
              <motion.p
                key={`${youScore}-${themScore}`}
                initial={{ scale: 0.9, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display text-4xl font-black tabular-nums tracking-tight text-white drop-shadow-md"
              >
                {toLocaleDigits(youScore, locale)}
                <span className="mx-1.5 text-white/35">–</span>
                {toLocaleDigits(themScore, locale)}
              </motion.p>
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="mt-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 font-display text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 ring-1 ring-amber-300/40"
              >
                VS
              </motion.span>
            </div>
            <PlayerBlock
              player={them}
              muted={status === "COMPLETED" && outcome === "WIN"}
            />
          </div>
        </motion.header>

        {/* Round board */}
        <div className="relative flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="font-display text-[11px] font-extrabold uppercase tracking-widest text-white/45">
              {t("duel.scorecard.board")}
            </p>
            <p className="font-display text-[11px] font-bold text-white/35">
              {t("duel.scorecard.boardHint")}
            </p>
          </div>
          {rounds.map((round, i) => (
            <RoundRow key={round.roundNumber} round={round} index={i} />
          ))}
        </div>

        {!hideFooter && (
          <motion.footer
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-auto flex flex-col gap-2.5 pt-1"
          >
            {status === "WAITING" ? (
              <WaitingCard />
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
                  "min-h-touch w-full justify-center rounded-bubble border-2 px-5 py-3 font-display text-sm font-bold transition-transform active:scale-[0.98]",
                  status === "COMPLETED"
                    ? "border-amber-300/50 bg-amber-400/15 text-amber-200"
                    : "border-white/15 bg-white/8 text-white/70",
                ].join(" ")}
              >
                {secondaryLabel}
              </button>
            )}
          </motion.footer>
        )}
      </div>
    </section>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: ScorecardMatchStatus;
  label: string;
}) {
  const tone =
    status === "YOUR_TURN"
      ? "bg-emerald-400/20 text-emerald-200 ring-emerald-300/45"
      : status === "WAITING"
        ? "bg-amber-400/20 text-amber-200 ring-amber-300/45"
        : "bg-white/10 text-white/70 ring-white/20";
  const dot =
    status === "YOUR_TURN"
      ? "bg-emerald-400"
      : status === "WAITING"
        ? "bg-amber-400"
        : "bg-white/50";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-[11px] font-extrabold uppercase tracking-wider ring-1",
        tone,
      ].join(" ")}
    >
      <motion.span
        className={["h-2 w-2 rounded-full", dot].join(" ")}
        animate={
          status === "COMPLETED"
            ? { scale: 1 }
            : { opacity: [1, 0.35, 1], scale: [1, 1.25, 1] }
        }
        transition={{ repeat: Infinity, duration: 1 }}
      />
      {label}
    </span>
  );
}

function WaitingCard() {
  const { t } = useTranslation();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-5 text-center ring-1 ring-amber-300/20">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-amber-300/10 to-transparent"
        animate={{ x: ["-40%", "120%"] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
      />
      <div className="relative mx-auto mb-2 flex h-12 w-12 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-amber-300/50"
          animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
          transition={{ repeat: Infinity, duration: 1.3 }}
        />
        <motion.span
          className="absolute inset-1 rounded-full border border-dashed border-amber-200/60"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        />
        <span className="relative text-xl" aria-hidden>
          ⏱️
        </span>
      </div>
      <p className="relative font-display text-base font-black text-amber-100">
        {t("duel.scorecard.waitingTitle")}
      </p>
      <p className="relative mt-1 font-body text-xs font-semibold text-amber-100/65">
        {t("duel.summaryAutoRefresh")}
      </p>
    </div>
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
  const tone =
    outcome === "WIN"
      ? "text-emerald-300"
      : outcome === "DRAW"
        ? "text-amber-200"
        : "text-rose-300";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative mb-2 flex flex-col items-center gap-1"
    >
      <span className="text-4xl drop-shadow" aria-hidden>
        {emoji}
      </span>
      <p className={["font-display text-xl font-black", tone].join(" ")}>
        {copy}
      </p>
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
  const { t } = useTranslation();
  const ringStyle =
    muted || !you ? undefined : clubAccentRingStyle(player.colorKey);
  const themAccent =
    !you && player.colorKey ? getClubColor(player.colorKey) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div
        className="relative rounded-full"
        style={
          ringStyle ??
          (themAccent && !muted
            ? { boxShadow: `0 0 0 3px ${themAccent.hex}99` }
            : undefined)
        }
      >
        <motion.span
          aria-hidden
          className={[
            "absolute -inset-2 rounded-full blur-md",
            you ? "bg-primary/35" : "bg-secondary/30",
            muted ? "opacity-0" : "",
          ].join(" ")}
          animate={muted ? undefined : { opacity: [0.35, 0.7, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
        />
        <AvatarImage
          avatarKey={player.avatarKey}
          colorKey={player.colorKey}
          muted={muted}
          className={[
            "relative h-18 w-18 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.45)]",
            muted ? "opacity-70 ring-3 ring-white/15" : "",
            !you && !player.colorKey && !muted ? "ring-3 ring-white/25" : "",
          ].join(" ")}
        />
        <span className="absolute -bottom-1 left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full bg-amber-400 px-1.5 font-display text-[11px] font-black text-amber-950 shadow-md ring-2 ring-[#121820]">
          {player.level}
        </span>
        {player.isBot && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#1a2433] text-sm shadow ring-2 ring-amber-300/50">
            🤖
          </span>
        )}
        {you && (
          <span className="absolute -inset-s-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 font-display text-[9px] font-black text-primary-foreground shadow">
            {t("duel.you")}
          </span>
        )}
      </div>
      <p
        className={[
          "max-w-26 truncate font-display text-xs font-bold",
          muted ? "text-white/40" : "text-white",
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
        className="relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/4 px-3 py-5 text-center"
      >
        <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-base ring-1 ring-white/15">
          🔒
        </div>
        <p className="font-display text-sm font-bold text-white/45">
          {t("duel.scorecard.roundLocked", {
            n: toLocaleDigits(round.roundNumber, locale),
          })}
        </p>
      </motion.div>
    );
  }

  const youGoals = countCorrect(round.youAnswers);
  const themGoals = countCorrect(round.themAnswers);
  const lead =
    round.waitingOnThem
      ? null
      : youGoals > themGoals
        ? "you"
        : themGoals > youGoals
          ? "them"
          : "draw";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.06 * index,
        type: "spring",
        stiffness: 280,
        damping: 22,
      }}
      className={[
        "relative overflow-hidden rounded-2xl border px-3 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
        round.waitingOnThem
          ? "border-amber-300/35 bg-amber-400/8"
          : "border-white/12 bg-white/5",
      ].join(" ")}
    >
      {lead === "you" && (
        <span
          aria-hidden
          className="absolute inset-y-0 inset-s-0 w-1 bg-emerald-400"
        />
      )}
      {lead === "them" && (
        <span
          aria-hidden
          className="absolute inset-y-0 inset-e-0 w-1 bg-rose-400"
        />
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <AnswerStrip answers={round.youAnswers} align="end" />

        <div className="flex min-w-0 max-w-24 flex-col items-center gap-0.5 px-0.5 text-center">
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
            {t("duel.scorecard.round", {
              n: toLocaleDigits(round.roundNumber, locale),
            })}
          </span>
          <span className="truncate font-display text-xs font-black leading-tight text-white">
            {cat}
          </span>
          {!round.waitingOnThem && (
            <span className="font-display text-[11px] font-black tabular-nums text-white/70">
              {toLocaleDigits(youGoals, locale)}–
              {toLocaleDigits(themGoals, locale)}
            </span>
          )}
        </div>

        <div className="flex justify-start">
          {round.waitingOnThem ? (
            <motion.span
              animate={{ opacity: [0.65, 1, 0.65] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="rounded-full bg-amber-400/20 px-2.5 py-1.5 text-center font-display text-[11px] font-bold leading-tight text-amber-200 ring-1 ring-amber-300/40"
            >
              {t("duel.scorecard.theirTurn")}
            </motion.span>
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
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] shadow-[0_2px_0_0_rgb(4,120,87)] ring-1 ring-emerald-300/50"
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
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px] shadow-[0_2px_0_0_rgb(159,18,57)] ring-1 ring-rose-300/40"
        title="Miss"
        aria-label="Incorrect"
      >
        —
      </motion.span>
    );
  }
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 bg-white/5"
      aria-label="Empty"
    />
  );
}

function countCorrect(answers: ScorecardAnswer[]): number {
  return answers.filter((a) => a === true).length;
}
