"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePenaltyStore } from "@/stores/penaltyStore";
import { useLanguageStore } from "@/stores/languageStore";
import { getMatchQuestions } from "@/actions/getMatchQuestions";
import type { QuizQuestion } from "@/lib/quiz/types";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { FuseTimer } from "./FuseTimer";
import { QuestionCard } from "./QuestionCard";
import { AnswerButton } from "./AnswerButton";
import { Scoreboard } from "./Scoreboard";
import { MatchResult } from "./MatchResult";
import { GoalBurst } from "./GoalBurst";
import { MissedPopup } from "./MissedPopup";
import { ReportModal } from "./ReportModal";

/** Auto-advance delay after a scored goal (miss waits for Continue tap). */
const GOAL_REVEAL_MS = 1500;

const TUTORIAL_SIZE = 3;

type PenaltyMatchProps = {
  /** FTUE tutorial run: short 3-question shootout with a guaranteed payout. */
  tutorial?: boolean;
  /** Server-drawn question set (authoritative bank lives in the DB). */
  initialQuestions: QuizQuestion[];
};

export function PenaltyMatch({
  tutorial = false,
  initialQuestions,
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

  const start = usePenaltyStore((s) => s.start);
  const tick = usePenaltyStore((s) => s.tick);
  const answer = usePenaltyStore((s) => s.answer);
  const next = usePenaltyStore((s) => s.next);
  const reset = usePenaltyStore((s) => s.reset);

  const [shake, setShake] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Kick off a match on mount with the server-drawn set, clean up on unmount.
  useEffect(() => {
    start(initialQuestions);
    // Kick-off whistle when the match/timer starts.
    playSound("whistle");
    return () => reset();
  }, [start, reset, initialQuestions]);

  // Play Again draws a FRESH random set from the DB so replays aren't identical.
  // Falls back to the initial set if the fetch returns nothing.
  const handlePlayAgain = useCallback(async () => {
    const next = await getMatchQuestions(
      tutorial ? { count: TUTORIAL_SIZE, difficulties: ["easy"] } : {},
    );
    start(next.length > 0 ? next : initialQuestions);
    playSound("whistle");
  }, [tutorial, start, initialQuestions]);

  // Timer loop via rAF — only runs while playing (paused on reveal).
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "playing") {
      lastTsRef.current = null;
      return;
    }

    const loop = (ts: number) => {
      if (lastTsRef.current !== null) {
        tick(ts - lastTsRef.current);
      }
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
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
      const t = setTimeout(() => next(), GOAL_REVEAL_MS);
      return () => clearTimeout(t);
    }

    // Miss → shake the container; advance waits for the popup's Continue.
    setShake(true);
  }, [phase, feedback, next]);

  if (phase === "finished" && rewards) {
    return (
      <MatchResult
        rewards={rewards}
        totalKicks={questions.length}
        tutorial={tutorial}
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
          <FuseTimer timeLeftMs={timeLeftMs} paused={locked} />
        </header>

        <AnimatePresence mode="wait">
          <QuestionCard
            key={question.id}
            text={content.text}
            category={content.category}
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
                reveal={locked ? feedback : null}
                onSelect={(i) => answer(i)}
              />
            </motion.div>
          ))}
        </motion.div>
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
