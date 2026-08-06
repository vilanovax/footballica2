"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePenaltyStore } from "@/stores/penaltyStore";
import { useLanguageStore } from "@/stores/languageStore";
import { getMatchDraw } from "@/actions/getMatchDraw";
import type { QuizQuestion } from "@/lib/quiz/types";
import type { GameConfig } from "@/lib/game/economy";
import type { HelperKey } from "@/lib/game/helpers";
import { QUICK_DURATION_MS } from "@/lib/quiz/scoring";
import { getPenaltyLiveTimeLeftMs } from "@/lib/quiz/liveMatchClock";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { QuickTimer, type QuickTimerHandle } from "./QuickTimer";
import { QuestionCard } from "./QuestionCard";
import { AnswerButton } from "./AnswerButton";
import { ExplanationFact } from "./ExplanationFact";
import { HelperDock } from "./HelperDock";
import { GoalBurst } from "./GoalBurst";
import { MatchLeaveControl } from "./MatchLeaveControl";

// Post-match / rare chrome — keep out of the kickoff JS chunk.
const MatchResult = dynamic(() =>
  import("./MatchResult").then((m) => m.MatchResult),
);
const ReportModal = dynamic(() =>
  import("./ReportModal").then((m) => m.ReportModal),
);
const FormatDevToggle = dynamic(() =>
  import("./FormatDevToggle").then((m) => m.FormatDevToggle),
);

/**
 * Rapid-fire pause after each answer BEFORE auto-advancing. Unlike Penalty
 * Mode (which waits for a "Continue" tap on a miss), Quick Match keeps the
 * momentum by auto-advancing on BOTH a goal and a miss.
 */
const QUICK_REVEAL_MS = 850;

type QuickMatchProps = {
  /** Server-drawn question set (authoritative bank lives in the DB). */
  initialQuestions: QuizQuestion[];
  /** Spare questions backing the Substitution helper. */
  bench: QuizQuestion[];
  /** Questions per match, from Live-Ops config; reused for Play Again. */
  matchSize: number;
  /** Coin balance at kickoff — the affordability ceiling for helpers. */
  startingCoins: number;
  /** Live in-match helper costs. */
  helpers: GameConfig["helpers"];
};

export function QuickMatch({
  initialQuestions,
  bench,
  matchSize,
  startingCoins,
  helpers,
}: QuickMatchProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const lang = useLanguageStore((s) => s.locale);

  const phase = usePenaltyStore((s) => s.phase);
  const questions = usePenaltyStore((s) => s.questions);
  const currentIndex = usePenaltyStore((s) => s.currentIndex);
  const durationMs = usePenaltyStore((s) => s.durationMs);
  const goals = usePenaltyStore((s) => s.goals);
  const feedback = usePenaltyStore((s) => s.feedback);
  const rewards = usePenaltyStore((s) => s.rewards);
  const log = usePenaltyStore((s) => s.log);
  const paused = usePenaltyStore((s) => s.paused);
  const eliminated = usePenaltyStore((s) => s.eliminated);
  const helpersThisQuestion = usePenaltyStore((s) => s.helpersThisQuestion);
  const helpersLog = usePenaltyStore((s) => s.helpersLog);
  const coinsSpent = usePenaltyStore((s) => s.coinsSpent);
  const startCoins = usePenaltyStore((s) => s.startingCoins);
  const benchLeft = usePenaltyStore((s) => s.bench.length);

  const start = usePenaltyStore((s) => s.start);
  const tick = usePenaltyStore((s) => s.tick);
  const answer = usePenaltyStore((s) => s.answer);
  const next = usePenaltyStore((s) => s.next);
  const reset = usePenaltyStore((s) => s.reset);
  const timerRef = useRef<QuickTimerHandle>(null);
  const useHelper = usePenaltyStore((s) => s.useHelper);
  const setPaused = usePenaltyStore((s) => s.setPaused);

  const [shake, setShake] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleLeaveMatch = useCallback(() => {
    reset();
    router.push("/play");
  }, [reset, router]);

  // Seed the match EXACTLY ONCE on mount. A server-action refresh (Next.js
  // auto-refreshes the route after resolveMatch runs) re-renders this page and
  // hands us a fresh `initialQuestions` array — depending on it here would
  // silently restart a just-finished match back at question 1. Play Again
  // re-seeds explicitly via handlePlayAgain instead.
  useEffect(() => {
    start(initialQuestions, {
      durationMs: QUICK_DURATION_MS,
      bench,
      startingCoins,
      helpers,
    });
    playSound("whistle");
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play Again draws a FRESH set + up-to-date coin budget so replays differ and
  // helpers price against the new balance.
  const handlePlayAgain = useCallback(async () => {
    const draw = await getMatchDraw({ count: matchSize, bench: 3 });
    start(draw.questions.length > 0 ? draw.questions : initialQuestions, {
      durationMs: QUICK_DURATION_MS,
      bench: draw.bench,
      startingCoins: draw.startingCoins,
      helpers,
    });
    playSound("whistle");
  }, [matchSize, start, initialQuestions, helpers]);

  // Optimistic helper spend — applied instantly, settled in resolveMatch.
  const handleUseHelper = useCallback(
    (key: HelperKey) => {
      useHelper(key);
      haptic(HAPTIC.tap);
      playSound("upgrade");
    },
    [useHelper],
  );

  // Timer loop via rAF — clock outside Zustand; bar painted imperatively.
  useEffect(() => {
    if (phase !== "playing") return;

    let frameId = 0;
    let last: number | null = null;
    let cancelled = false;
    const duration = Math.max(1, durationMs);

    const loop = (ts: number) => {
      if (cancelled) return;
      if (last !== null) tick(ts - last);
      last = ts;
      timerRef.current?.setRatio(getPenaltyLiveTimeLeftMs() / duration);
      frameId = requestAnimationFrame(loop);
    };

    timerRef.current?.setRatio(getPenaltyLiveTimeLeftMs() / duration);
    frameId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [phase, tick, durationMs]);

  // Reveal reactions: feedback SFX/haptics + shake on miss, then auto-advance
  // for BOTH outcomes — that constant forward motion is the rapid-fire feel.
  useEffect(() => {
    if (phase !== "reveal" || !feedback) return;

    if (feedback.result === "goal") {
      playSound("goal");
      haptic(HAPTIC.goal);
    } else {
      playSound("miss");
      haptic(HAPTIC.miss);
      setShake(true);
    }

    const hasFact = Boolean(questions[currentIndex]?.explanation);
    const timer = setTimeout(
      () => next(),
      hasFact ? 1600 : QUICK_REVEAL_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, feedback, next, questions, currentIndex]);

  if (phase === "finished" && rewards) {
    return (
      <MatchResult
        totalKicks={questions.length}
        mode="quick"
        helpersUsed={helpersLog}
        submissions={log.map((k) => ({
          questionId: k.questionId,
          selectedIndex: k.selectedIndex,
          msRemaining: k.msRemaining,
        }))}
        onPlayAgain={handlePlayAgain}
        onExit={() => router.push("/club")}
      />
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  const content = question.content[lang] ?? question.content.en;
  const locked = phase === "reveal";
  const showGoal = locked && feedback?.result === "goal";
  const showMiss = locked && feedback?.result === "miss";

  // Trailing run of correct answers (the live streak). The current kick is
  // already logged by the time we reveal, so this reflects it immediately.
  let streak = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].result === "goal") streak += 1;
    else break;
  }

  return (
    <section className="relative flex flex-1 flex-col">
      {process.env.NODE_ENV === "development" ? <FormatDevToggle /> : null}
      <div
        className={["flex flex-1 flex-col gap-5", shake ? "animate-screen-shake" : ""].join(" ")}
        onAnimationEnd={() => setShake(false)}
      >
        <header className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-2">
            <MatchLeaveControl
              setPaused={setPaused}
              onConfirmLeave={handleLeaveMatch}
            />
            <p className="min-w-0 flex-1 font-display text-sm font-bold uppercase tracking-widest text-secondary">
              {t("quiz.quickMode")}
            </p>
            <p className="shrink-0 font-display text-sm font-semibold text-muted-foreground">
              {t("quiz.questionOf", {
                n: toLocaleDigits(currentIndex + 1, lang),
                total: toLocaleDigits(questions.length, lang),
              })}
            </p>
          </div>

          {/* Live score + streak chips — the rapid-fire "keep the run alive" hook */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-display text-sm font-bold text-primary">
              ⚽️ {toLocaleDigits(goals, lang)}
            </span>
            <motion.span
              key={streak}
              initial={streak >= 2 ? { scale: 0.6 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 16 }}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-sm font-bold transition-colors",
                streak >= 2
                  ? "bg-accent/20 text-accent-deep"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              🔥 {toLocaleDigits(streak, lang)}
            </motion.span>
            <div className="flex-1" />
          </div>

          <QuickTimer ref={timerRef} paused={locked || paused} />
        </header>

        <QuestionCard
          key={question.id}
          text={content.text}
          category={content.category}
          type={question.type}
          mediaUrl={question.mediaUrl}
          careerPath={content.careerPath}
          higherLower={content.higherLower}
          imageCleared={locked}
          questionId={question.id}
          onReport={() => setReportOpen(true)}
        />

        <motion.div
          key={`opts-${question.id}`}
          className="flex flex-col gap-3"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
          }}
        >
          {content.options.map((option, index) => (
            <motion.div
              key={`${question.id}-${index}`}
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 320, damping: 24 },
                },
              }}
            >
              <AnswerButton
                label={option}
                index={index}
                disabled={locked}
                eliminated={eliminated.includes(index)}
                reveal={locked ? feedback : null}
                onSelect={(i) => answer(i)}
              />
            </motion.div>
          ))}
        </motion.div>

        <ExplanationFact
          explanation={question.explanation}
          visible={locked}
        />

        {helpers && (
          <HelperDock
            helpers={helpers}
            coinsLeft={startCoins - coinsSpent}
            usedThisQuestion={helpersThisQuestion}
            eliminatedCount={eliminated.length}
            optionCount={content.options.length}
            benchLeft={benchLeft}
            disabled={locked || paused}
            onUse={handleUseHelper}
          />
        )}
      </div>

      {showGoal && <GoalBurst />}

      {/* Non-blocking miss flash — pointer-events-none so it never eats a tap
          (auto-advance handles progression; there is no Continue button). */}
      {showMiss && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.span
            initial={{ scale: 0.4, y: 20, rotate: -8 }}
            animate={{ scale: [0.4, 1.2, 1], y: [20, -6, -30], rotate: [-8, 4, 0] }}
            transition={{ duration: 0.8, times: [0, 0.45, 1], ease: "easeOut" }}
            className="flex flex-col items-center gap-1"
            aria-hidden
          >
            <span className="text-5xl drop-shadow">🧤</span>
            <span className="font-display text-3xl font-bold text-destructive drop-shadow">
              {t("quiz.missed")}
            </span>
          </motion.span>
        </motion.div>
      )}

      {reportOpen && (
        <ReportModal
          questionId={question.id}
          onClose={() => setReportOpen(false)}
        />
      )}
    </section>
  );
}
