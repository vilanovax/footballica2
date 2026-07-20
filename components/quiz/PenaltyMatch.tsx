"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePenaltyStore } from "@/stores/penaltyStore";
import { PENALTY_QUESTIONS } from "@/lib/quiz/mock-questions";
import { FuseTimer } from "./FuseTimer";
import { QuestionCard } from "./QuestionCard";
import { AnswerButton } from "./AnswerButton";
import { Scoreboard } from "./Scoreboard";
import { MatchResult } from "./MatchResult";
import { GoalBurst } from "./GoalBurst";
import { MissedPopup } from "./MissedPopup";

/** Auto-advance delay after a scored goal (miss waits for Continue tap). */
const GOAL_REVEAL_MS = 1500;

export function PenaltyMatch() {
  const router = useRouter();

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

  // Kick off a match on mount, clean up on unmount.
  useEffect(() => {
    start(PENALTY_QUESTIONS);
    return () => reset();
  }, [start, reset]);

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

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(feedback.result === "goal" ? 30 : [90, 40, 140]);
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
        submissions={log.map((k) => ({
          questionId: k.questionId,
          selectedIndex: k.selectedIndex,
          msRemaining: k.msRemaining,
        }))}
        onPlayAgain={() => start(PENALTY_QUESTIONS)}
        onExit={() => router.push("/club")}
      />
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

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
              Penalty Mode
            </p>
            <p className="font-display text-sm font-semibold text-muted-foreground">
              Kick {currentIndex + 1} / {questions.length}
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
          <QuestionCard key={question.id} question={question} />
        </AnimatePresence>

        <div className="flex flex-col gap-3">
          {question.options.map((option, index) => (
            <AnswerButton
              key={`${question.id}-${index}`}
              label={option}
              index={index}
              disabled={locked}
              reveal={locked ? feedback : null}
              onSelect={(i) => answer(i)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>{showGoal && <GoalBurst key="goal" />}</AnimatePresence>

      <AnimatePresence>
        {showMiss && <MissedPopup key="miss" onContinue={() => next()} />}
      </AnimatePresence>
    </section>
  );
}
