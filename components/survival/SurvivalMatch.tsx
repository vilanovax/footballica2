"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSurvivalStore } from "@/stores/survivalStore";
import { useLanguageStore } from "@/stores/languageStore";
import { drawSurvivalBatch } from "@/actions/match/drawSurvivalBatch";
import type { QuizQuestion } from "@/lib/quiz/types";
import type { DuelCategoryOption } from "@/lib/duel/types";
import {
  SURVIVAL_LIVES,
  SURVIVAL_PREFETCH_BELOW,
} from "@/lib/game/survival";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { QuickTimer } from "@/components/quiz/QuickTimer";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerButton } from "@/components/quiz/AnswerButton";
import { ExplanationFact } from "@/components/quiz/ExplanationFact";
import { GoalBurst } from "@/components/quiz/GoalBurst";
import { ReportModal } from "@/components/quiz/ReportModal";
import { SurvivalResult } from "@/components/survival/SurvivalResult";
import { FormatDevToggle } from "@/components/quiz/FormatDevToggle";
import { MatchLeaveControl } from "@/components/quiz/MatchLeaveControl";

const REVEAL_MS = 900;

type SurvivalMatchProps = {
  category: DuelCategoryOption;
  initialQuestions: QuizQuestion[];
  /** Premium RecordChallenge id (requires prior unlock). */
  challengeId?: string | null;
};

export function SurvivalMatch({
  category,
  initialQuestions,
  challengeId = null,
}: SurvivalMatchProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const lang = useLanguageStore((s) => s.locale);

  const phase = useSurvivalStore((s) => s.phase);
  const queue = useSurvivalStore((s) => s.queue);
  const lives = useSurvivalStore((s) => s.lives);
  const score = useSurvivalStore((s) => s.score);
  const timeLeftMs = useSurvivalStore((s) => s.timeLeftMs);
  const durationMs = useSurvivalStore((s) => s.durationMs);
  const feedback = useSurvivalStore((s) => s.feedback);
  const log = useSurvivalStore((s) => s.log);
  const endReason = useSurvivalStore((s) => s.endReason);
  const categoryId = useSurvivalStore((s) => s.categoryId);
  const paused = useSurvivalStore((s) => s.paused);
  const prefetching = useSurvivalStore((s) => s.prefetching);

  const start = useSurvivalStore((s) => s.start);
  const tick = useSurvivalStore((s) => s.tick);
  const answer = useSurvivalStore((s) => s.answer);
  const next = useSurvivalStore((s) => s.next);
  const appendBatch = useSurvivalStore((s) => s.appendBatch);
  const clearBank = useSurvivalStore((s) => s.clearBank);
  const setPrefetching = useSurvivalStore((s) => s.setPrefetching);
  const reset = useSurvivalStore((s) => s.reset);
  const setPaused = useSurvivalStore((s) => s.setPaused);

  const [shake, setShake] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const prefetchLock = useRef(false);

  const handleLeaveMatch = useCallback(() => {
    reset();
    router.push("/play");
  }, [reset, router]);

  useEffect(() => {
    start(category.id, initialQuestions);
    playSound("whistle");
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefetch = useCallback(async () => {
    if (prefetchLock.current) return;
    prefetchLock.current = true;
    setPrefetching(true);
    try {
      const state = useSurvivalStore.getState();
      const cat = state.categoryId;
      if (!cat) return;
      // Answered + still in the local queue — avoid re-drawing in-flight cards.
      const excludeIds = [
        ...new Set([
          ...state.seenQuestionIds,
          ...state.queue.map((q) => q.id),
          ...state.log.map((e) => e.questionId),
        ]),
      ];
      const res = await drawSurvivalBatch({
        categoryId: cat,
        seenQuestionIds: excludeIds,
        challengeId,
      });
      if (!res.ok) return;
      if (res.questions.length === 0) {
        // Victory Cap only when the local queue is also empty.
        const remaining = useSurvivalStore.getState().queue.length;
        if (remaining === 0) {
          clearBank();
          playSound("goal");
          haptic(HAPTIC.goal);
        }
        return;
      }
      appendBatch(res.questions);
    } finally {
      prefetchLock.current = false;
      setPrefetching(false);
    }
  }, [appendBatch, clearBank, setPrefetching, challengeId]);

  // Timer loop
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

  // Reveal → advance / Victory Cap
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

    const question = queue[0];
    const hasFact = Boolean(question?.explanation);
    const timer = setTimeout(() => {
      const advance = next();
      if (advance.finished) return;
      if (advance.needPrefetch) {
        void prefetch();
      }
    }, hasFact ? 1600 : REVEAL_MS);

    return () => clearTimeout(timer);
  }, [phase, feedback, next, prefetch, queue]);

  // If we're playing with an empty queue (waiting on prefetch), keep trying.
  useEffect(() => {
    if (phase !== "playing") return;
    if (queue.length > 0) return;
    if (prefetching) return;
    void prefetch();
  }, [phase, queue.length, prefetching, prefetch]);

  // Warm prefetch while still answering.
  useEffect(() => {
    if (phase !== "playing") return;
    if (queue.length === 0 || queue.length > SURVIVAL_PREFETCH_BELOW) return;
    if (prefetching) return;
    void prefetch();
  }, [phase, queue.length, prefetching, prefetch]);

  if (phase === "finished" && endReason && categoryId) {
    return (
      <SurvivalResult
        challengeId={challengeId}
        categoryId={categoryId}
        endReason={endReason}
        submissions={log.map((k) => ({
          questionId: k.questionId,
          selectedIndex: k.selectedIndex,
          msRemaining: k.msRemaining,
        }))}
        onPlayAgain={() => {
          reset();
          const qs = new URLSearchParams({
            category: category.id,
            run: String(Date.now()),
          });
          if (challengeId) qs.set("challenge", challengeId);
          router.replace(`/play/survival?${qs.toString()}`);
        }}
        onExit={() => router.push("/play/survival")}
      />
    );
  }

  const question = queue[0];
  if (!question) {
    return (
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-destructive/12 via-transparent to-primary/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute start-1/2 top-[28%] h-44 w-44 -translate-x-1/2 rounded-full bg-destructive/20 blur-3xl"
        />

        <motion.div
          className="relative"
          animate={{ scale: [1, 1.08, 1], y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.1,
            ease: "easeInOut",
          }}
          aria-hidden
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-destructive/25 blur-xl"
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.15, 0.9] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/heart.png"
            alt=""
            draggable={false}
            className="relative h-28 w-28 object-contain drop-shadow-[0_6px_18px_rgba(220,38,38,0.35)]"
          />
        </motion.div>

        <motion.p
          className="relative mt-5 font-display text-xl font-black text-foreground"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        >
          {t("survival.loadingBatch")}
        </motion.p>

        <div className="relative mt-4 flex items-center gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-destructive"
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
              transition={{
                repeat: Infinity,
                duration: 0.9,
                delay: i * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  const content = question.content[lang] ?? question.content.en;
  const locked = phase === "reveal";
  const showGoal = locked && feedback?.result === "goal";
  const catLabel = locale === "fa" ? category.nameFa : category.nameEn;

  let streak = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i]!.result === "goal") streak += 1;
    else break;
  }

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
          <div className="flex items-center gap-2">
            <MatchLeaveControl
              setPaused={setPaused}
              onConfirmLeave={handleLeaveMatch}
            />
            <p className="min-w-0 flex-1 font-display text-sm font-bold uppercase tracking-widest text-secondary">
              {t("survival.eyebrow")}
            </p>
            <p className="shrink-0 font-display text-sm font-semibold text-muted-foreground">
              {category.icon || "📚"} {catLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-3 py-1 font-display text-base"
              aria-label={t("survival.lives", {
                n: toLocaleDigits(lives, locale),
              })}
            >
              {Array.from({ length: SURVIVAL_LIVES }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={
                    i < lives
                      ? { scale: 1, opacity: 1 }
                      : { scale: 0.75, opacity: 0.28 }
                  }
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  aria-hidden
                  className="inline-flex"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/heart.png"
                    alt=""
                    draggable={false}
                    className="h-5 w-5 object-contain"
                  />
                </motion.span>
              ))}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-display text-sm font-bold text-primary">
              ⚽️ {toLocaleDigits(score, locale)}
            </span>
            <motion.span
              key={streak}
              initial={streak >= 2 ? { scale: 0.6 } : false}
              animate={{ scale: 1 }}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-sm font-bold",
                streak >= 2
                  ? "bg-accent/20 text-accent-deep"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              🔥 {toLocaleDigits(streak, locale)}
            </motion.span>
          </div>

          <QuickTimer
            timeLeftMs={timeLeftMs}
            totalMs={durationMs}
            paused={locked || paused}
          />
        </header>

        <QuestionCard
          key={question.id}
          text={content.text}
          category={content.category || catLabel}
          type={question.type}
          mediaUrl={question.mediaUrl}
          careerPath={content.careerPath}
          higherLower={content.higherLower}
          imageCleared={locked}
          questionId={question.id}
          onReport={() => setReportOpen(true)}
        />

        <div className="flex flex-col gap-3">
          {content.options.map((label, index) => (
            <AnswerButton
              key={`${question.id}-${index}`}
              label={label}
              index={index}
              disabled={locked}
              reveal={feedback}
              onSelect={(i) => answer(i)}
            />
          ))}
        </div>

        {locked && (
          <ExplanationFact
            explanation={question.explanation}
            visible={locked}
          />
        )}
      </div>

      {showGoal && <GoalBurst />}
      {reportOpen && (
        <ReportModal
          questionId={question.id}
          onClose={() => setReportOpen(false)}
        />
      )}
    </section>
  );
}
