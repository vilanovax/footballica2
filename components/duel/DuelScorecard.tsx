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
import { GameChip, GameCta, GamePanel } from "@/components/ui/game";
import { cn } from "@/lib/utils";

type DuelScorecardProps = {
  data: ScorecardData;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  /** When embedded in a result shell, omit sticky CTAs. */
  hideFooter?: boolean;
  /** Parent already shows Win/Lose — skip the inner banner. */
  hideOutcomeBanner?: boolean;
  /** Result page: denser card, rounds-won caption. */
  variant?: "live" | "result";
};

/**
 * Quiz-of-Kings style async PvP scorecard — arena presentation.
 */
export function DuelScorecard({
  data,
  onPrimaryAction,
  onSecondaryAction,
  hideFooter = false,
  hideOutcomeBanner = false,
  variant = "live",
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

  const isResult = variant === "result";
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
    <section
      className={cn(
        "relative flex flex-1 flex-col overflow-hidden rounded-bubble-xl",
        !isResult && "game-sheet",
        isResult ? "min-h-0" : "min-h-[min(100%,34rem)]",
      )}
    >
      {!isResult && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <div className="game-sheet-wash absolute inset-x-0 top-0 h-44" />
          <div className="absolute -start-16 top-1/4 h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="absolute -end-14 bottom-1/5 h-44 w-44 rounded-full bg-amber-400/12 blur-3xl" />
        </div>
      )}

      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col",
          isResult ? "gap-3 px-0 py-0" : "gap-4 px-2.5 py-4",
        )}
      >
        {!isResult && (
          <div className="flex justify-center">
            <StatusBadge status={status} label={statusCopy} />
          </div>
        )}

        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          <GamePanel
            tone="emerald"
            className={cn(isResult ? "px-3 py-4" : "px-3 py-5")}
          >
          {!hideOutcomeBanner && (
            <OutcomeBanner status={status} outcome={outcome} />
          )}

          {isResult && (
            <div className="relative mb-3 flex justify-center">
              <StatusBadge status={status} label={statusCopy} />
            </div>
          )}

          <div className="relative flex items-center justify-between gap-2">
            <PlayerBlock
              player={you}
              you
              muted={status === "COMPLETED" && outcome === "LOSE"}
              compact={isResult}
            />
            <div className="flex shrink-0 flex-col items-center px-1">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                {t("duel.scorecard.roundsWon")}
              </p>
              <motion.p
                key={`${youScore}-${themScore}`}
                initial={{ scale: 0.92, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "font-display font-black tabular-nums tracking-tight text-white drop-shadow-md",
                  isResult ? "text-5xl" : "text-4xl",
                )}
              >
                {toLocaleDigits(youScore, locale)}
                <span className="mx-1.5 text-white/35">–</span>
                {toLocaleDigits(themScore, locale)}
              </motion.p>
              <GameChip tone="amber" className="mt-1 uppercase tracking-[0.2em]">
                VS
              </GameChip>
            </div>
            <PlayerBlock
              player={them}
              muted={status === "COMPLETED" && outcome === "WIN"}
              compact={isResult}
            />
          </div>
          </GamePanel>
        </motion.header>

        <div className="relative flex flex-col gap-2">
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
              <GameCta
                variant="primary"
                block
                onClick={onPrimaryAction}
                className="font-display text-base font-black"
              >
                {primaryLabel}
              </GameCta>
            )}

            {(status === "COMPLETED" || status === "WAITING") && (
              <GameCta
                variant={status === "COMPLETED" ? "accent" : "ghost"}
                block
                onClick={onSecondaryAction}
                className="font-display text-sm font-bold"
              >
                {secondaryLabel}
              </GameCta>
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
  compact,
}: {
  player: ScorecardData["you"];
  you?: boolean;
  muted?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const ringStyle =
    muted || !you ? undefined : clubAccentRingStyle(player.colorKey);
  const themAccent =
    !you && player.colorKey ? getClubColor(player.colorKey) : null;
  const size = compact ? "h-16 w-16" : "h-18 w-18";

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
            "relative rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.45)]",
            size,
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
  const isMemory = round.roundType === "MEMORY";

  if (round.locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 * index }}
        className="relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/4 px-3 py-4 text-center"
      >
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
  const totalSlots = Math.max(
    round.youAnswers.length,
    round.themAnswers.length,
    1,
  );
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
        delay: 0.05 * index,
        type: "spring",
        stiffness: 280,
        damping: 22,
      }}
      className={[
        "relative overflow-hidden rounded-2xl border px-3 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
        round.waitingOnThem
          ? "border-amber-300/35 bg-amber-400/8"
          : lead === "you"
            ? "border-emerald-400/25 bg-emerald-500/8"
            : lead === "them"
              ? "border-rose-400/25 bg-rose-500/8"
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

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
            {t("duel.scorecard.round", {
              n: toLocaleDigits(round.roundNumber, locale),
            })}
          </span>
          <span
            className={[
              "shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold ring-1",
              isMemory
                ? "bg-violet-400/15 text-violet-200 ring-violet-300/35"
                : "bg-sky-400/15 text-sky-200 ring-sky-300/35",
            ].join(" ")}
          >
            {isMemory
              ? t("duel.scorecard.memoryTag")
              : t("duel.scorecard.quizTag")}
          </span>
          <span className="truncate font-display text-xs font-black text-white">
            {cat || "—"}
          </span>
        </div>
        {!round.waitingOnThem && (
          <span
            className={[
              "shrink-0 font-display text-[11px] font-black",
              lead === "you"
                ? "text-emerald-300"
                : lead === "them"
                  ? "text-rose-300"
                  : "text-white/55",
            ].join(" ")}
          >
            {lead === "you"
              ? t("duel.scorecard.roundWin")
              : lead === "them"
                ? t("duel.scorecard.roundLoss")
                : t("duel.scorecard.roundDraw")}
          </span>
        )}
      </div>

      {isMemory ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <PairMeter
            found={youGoals}
            total={totalSlots}
            align="end"
            delay={0}
          />
          <span className="px-1 font-display text-sm font-black tabular-nums text-white/80">
            {toLocaleDigits(youGoals, locale)}–
            {toLocaleDigits(themGoals, locale)}
          </span>
          {round.waitingOnThem ? (
            <WaitingChip />
          ) : (
            <PairMeter
              found={themGoals}
              total={totalSlots}
              align="start"
              delay={0.08}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <AnswerStrip answers={round.youAnswers} align="end" />
          <span className="px-1 font-display text-sm font-black tabular-nums text-white/80">
            {toLocaleDigits(youGoals, locale)}–
            {toLocaleDigits(themGoals, locale)}
          </span>
          {round.waitingOnThem ? (
            <WaitingChip />
          ) : (
            <AnswerStrip answers={round.themAnswers} align="start" />
          )}
        </div>
      )}
    </motion.div>
  );
}

function WaitingChip() {
  const { t } = useTranslation();
  return (
    <motion.span
      animate={{ opacity: [0.65, 1, 0.65] }}
      transition={{ repeat: Infinity, duration: 1.2 }}
      className="justify-self-start rounded-full bg-amber-400/20 px-2.5 py-1.5 text-center font-display text-[11px] font-bold leading-tight text-amber-200 ring-1 ring-amber-300/40"
    >
      {t("duel.scorecard.theirTurn")}
    </motion.span>
  );
}

function PairMeter({
  found,
  total,
  align,
  delay,
}: {
  found: number;
  total: number;
  align: "start" | "end";
  delay: number;
}) {
  const { t, locale } = useTranslation();
  const pct = Math.round((found / Math.max(1, total)) * 100);

  return (
    <div
      className={[
        "flex min-w-0 flex-col gap-1",
        align === "end" ? "items-end" : "items-start",
      ].join(" ")}
    >
      <p className="font-display text-[11px] font-bold tabular-nums text-white/75">
        {t("duel.scorecard.roundPairs", {
          n: toLocaleDigits(found, locale),
          total: toLocaleDigits(total, locale),
        })}
      </p>
      <div className="h-2 w-full max-w-28 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-violet-400 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
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
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay, type: "spring", stiffness: 420, damping: 18 }}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] shadow-[0_2px_0_0_rgb(4,120,87)] ring-1 ring-emerald-300/50"
        aria-label="Correct"
      >
        ⚽️
      </motion.span>
    );
  }
  if (value === false) {
    return (
      <motion.span
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay, type: "spring", stiffness: 420, damping: 18 }}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-500/90 text-[10px] font-black text-white ring-1 ring-rose-300/40"
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
