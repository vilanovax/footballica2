"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePenaltyStore } from "@/stores/penaltyStore";
import { useLanguageStore } from "@/stores/languageStore";
import { getMatchDraw } from "@/actions/getMatchDraw";
import type { QuizQuestion } from "@/lib/quiz/types";
import type { GameConfig } from "@/lib/game/economy";
import type { HelperKey } from "@/lib/game/helpers";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { FuseTimer } from "./FuseTimer";
import { QuestionCard } from "./QuestionCard";
import { AnswerButton } from "./AnswerButton";
import { ExplanationFact } from "./ExplanationFact";
import { HelperDock } from "./HelperDock";
import { Scoreboard } from "./Scoreboard";
import { MatchResult } from "./MatchResult";
import { GoalBurst } from "./GoalBurst";
import { MissedPopup } from "./MissedPopup";
import { ReportModal } from "./ReportModal";
import { FormatDevToggle } from "./FormatDevToggle";

/** Auto-advance delay after a scored goal (miss waits for Continue tap). */
const GOAL_REVEAL_MS = 1500;

type PenaltyMatchProps = {
  /** FTUE tutorial run: short shootout with a guaranteed payout. */
  tutorial?: boolean;
  /** Server-drawn question set (authoritative bank lives in the DB). */
  initialQuestions: QuizQuestion[];
  /** Spare questions backing the Substitution helper. */
  bench: QuizQuestion[];
  /** Kicks per match, from the Live-Ops config; reused for Play Again. */
  matchSize: number;
  /** Coin balance at kickoff — the affordability ceiling for helpers. */
  startingCoins: number;
  /** Live in-match helper costs. */
  helpers: GameConfig["helpers"];
};

export function PenaltyMatch({
  tutorial = false,
  initialQuestions,
  bench,
  matchSize,
  startingCoins,
  helpers,
}: PenaltyMatchProps) {
  const router = useRouter();
  const { t } = useTranslation();
  // Active language drives which localized question content is rendered.
  const lang = useLanguageStore((s) => s.locale);

  const phase = usePenaltyStore((s) => s.phase);
  const questions = usePenaltyStore((s) => s.questions);
  const currentIndex = usePenaltyStore((s) => s.currentIndex);
  const timeLeftMs = usePenaltyStore((s) => s.timeLeftMs);
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
  const useHelper = usePenaltyStore((s) => s.useHelper);

  const [shake, setShake] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Seed the match EXACTLY ONCE on mount. A server-action refresh (Next.js
  // auto-refreshes the route after resolveMatch runs) re-renders this page and
  // hands us a fresh `initialQuestions` array — depending on it here would
  // silently restart a just-finished match back at kick 1. Play Again re-seeds
  // explicitly via handlePlayAgain instead.
  useEffect(() => {
    start(initialQuestions, {
      bench,
      startingCoins,
      helpers: tutorial ? null : helpers,
    });
    playSound("whistle");
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play Again draws a FRESH set + an up-to-date coin budget so replays aren't
  // identical and helpers price against the new balance. Falls back to the
  // initial set if the fetch returns nothing.
  const handlePlayAgain = useCallback(async () => {
    const draw = await getMatchDraw(
      tutorial
        ? { count: matchSize, bench: 0, difficulties: ["easy"] }
        : { count: matchSize, bench: 3 },
    );
    start(draw.questions.length > 0 ? draw.questions : initialQuestions, {
      bench: draw.bench,
      startingCoins: draw.startingCoins,
      helpers: tutorial ? null : helpers,
    });
    playSound("whistle");
  }, [tutorial, matchSize, start, initialQuestions, helpers]);

  // Optimistic helper spend: apply the effect instantly (settled server-side in
  // resolveMatch). The dock only fires onUse when the helper is actually usable.
  const handleUseHelper = useCallback(
    (key: HelperKey) => {
      useHelper(key);
      haptic(HAPTIC.tap);
      playSound("upgrade");
    },
    [useHelper],
  );

  // Timer loop via rAF — only runs while playing (paused on reveal).
  // State is kept in locals (not refs) so every effect run owns an isolated
  // loop; a `cancelled` flag hard-stops any frame that fires after teardown.
  // This prevents loop accumulation under Strict Mode / Fast Refresh, which
  // would otherwise run several rAF loops at once and burn the fuse N× too fast.
  useEffect(() => {
    if (phase !== "playing") return;

    let frameId = 0;
    let last: number | null = null;
    let cancelled = false;

    const loop = (ts: number) => {
      if (cancelled) return;
      if (last !== null) tick(ts - last);
      last = ts;
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [phase, tick]);

  // Reveal reactions: haptics, screen shake on miss, auto-advance on goal.
  useEffect(() => {
    if (phase !== "reveal" || !feedback) return;

    if (feedback.result === "goal") {
      playSound("goal");
      haptic(HAPTIC.goal); // light 50ms
    } else {
      playSound("miss");
      haptic(HAPTIC.miss); // heavy [100,50,100]
    }

    if (feedback.result === "goal") {
      const hasFact = Boolean(questions[currentIndex]?.explanation);
      const hold = hasFact ? 2200 : GOAL_REVEAL_MS;
      const t = setTimeout(() => next(), hold);
      return () => clearTimeout(t);
    }

    // Miss → shake the container; advance waits for the popup's Continue.
    setShake(true);
  }, [phase, feedback, next, questions, currentIndex]);

  if (phase === "finished" && rewards) {
    return (
      <MatchResult
        totalKicks={questions.length}
        tutorial={tutorial}
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

  return (
    <section className="relative flex flex-1 flex-col">
      <FormatDevToggle />
      <div
        className={[
          "flex flex-1 flex-col gap-5",
          shake ? "animate-screen-shake" : "",
        ].join(" ")}
        onAnimationEnd={() => setShake(false)}
      >
        <header className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-secondary">
              {t("quiz.penaltyMode")}
            </p>
            <p className="font-display text-sm font-semibold text-muted-foreground">
              {t("quiz.kickOf", {
                n: toLocaleDigits(currentIndex + 1, lang),
                total: toLocaleDigits(questions.length, lang),
              })}
            </p>
          </div>
          <Scoreboard
            kickNumber={currentIndex + 1}
            totalKicks={questions.length}
            goals={goals}
          />
          <FuseTimer timeLeftMs={timeLeftMs} paused={locked || paused} />
        </header>

        <AnimatePresence mode="wait">
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
        </AnimatePresence>

        <motion.div
          key={`opts-${question.id}`}
          className="flex flex-col gap-3"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
          }}
        >
          {content.options.map((option, index) => (
            <motion.div
              key={`${question.id}-${index}`}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 300, damping: 24 },
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

        {!tutorial && helpers && (
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

      <AnimatePresence>{showGoal && <GoalBurst key="goal" />}</AnimatePresence>

      <AnimatePresence>
        {showMiss && <MissedPopup key="miss" onContinue={() => next()} />}
      </AnimatePresence>

      <AnimatePresence>
        {reportOpen && (
          <ReportModal
            key="report"
            questionId={question.id}
            onClose={() => setReportOpen(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
