"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QuizQuestion } from "@/lib/quiz/types";
import { useLanguageStore } from "@/stores/languageStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { AnswerButton } from "@/components/quiz/AnswerButton";
import { ExplanationFact } from "@/components/quiz/ExplanationFact";
import { FormatPrompt } from "@/components/quiz/FormatPrompt";
import { GoalBurst } from "@/components/quiz/GoalBurst";
import type { DuelAnswerSubmission } from "@/lib/duel/types";

type DuelQuizProps = {
  title: string;
  subtitle?: string;
  /** Attack = orange heat; defend = cool sky. */
  mode?: "attack" | "defend";
  questions: QuizQuestion[];
  pending?: boolean;
  onComplete: (answers: DuelAnswerSubmission[]) => void;
};

/**
 * Fair-play quiz strip for Draft Duel — no helpers, no fuse. Instant reveal,
 * then auto-advance; submits the full log when the last question is done.
 */
export function DuelQuiz({
  title,
  subtitle,
  mode = "attack",
  questions,
  pending,
  onComplete,
}: DuelQuizProps) {
  const { t, locale } = useTranslation();
  const lang = useLanguageStore((s) => s.locale);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DuelAnswerSubmission[]>([]);
  const [results, setResults] = useState<(boolean | null)[]>(() =>
    Array.from({ length: questions.length }, () => null),
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealResult, setRevealResult] = useState<"goal" | "miss" | null>(
    null,
  );
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);
  const [qStartedAt, setQStartedAt] = useState(() => performance.now());

  const q = questions[index];
  if (!q) return null;

  const content = q.content[lang] ?? q.content.en;
  const total = questions.length;
  const goals = results.filter((r) => r === true).length;
  const isAttack = mode === "attack";
  const accent = isAttack
    ? {
        glow: "from-orange-500/25",
        badge: "bg-orange-500/20 text-orange-200 ring-orange-400/40",
        pulse: "bg-orange-400",
        bar: "bg-orange-400",
        score: "text-orange-300",
      }
    : {
        glow: "from-sky-500/25",
        badge: "bg-sky-500/20 text-sky-200 ring-sky-400/40",
        pulse: "bg-sky-400",
        bar: "bg-sky-400",
        score: "text-sky-300",
      };

  function handleSelect(picked: number) {
    if (locked || pending || !q) return;
    setLocked(true);
    const correct = picked === q.correctIndex;
    const entry: DuelAnswerSubmission = {
      questionId: q.id,
      selectedIndex: picked,
      ms: Math.round(performance.now() - qStartedAt),
    };
    const nextAnswers = [...answers, entry];
    setAnswers(nextAnswers);
    setSelectedIndex(picked);
    setRevealResult(correct ? "goal" : "miss");
    setResults((prev) => {
      const next = [...prev];
      next[index] = correct;
      return next;
    });

    if (correct) {
      playSound("goal");
      haptic(HAPTIC.goal);
    } else {
      playSound("miss");
      haptic(HAPTIC.miss);
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
    }

    window.setTimeout(() => {
      if (index + 1 >= total) {
        onComplete(nextAnswers);
        return;
      }
      setIndex((i) => i + 1);
      setSelectedIndex(null);
      setRevealResult(null);
      setLocked(false);
      setQStartedAt(performance.now());
    }, q.explanation ? 1600 : 750);
  }

  return (
    <section
      className={[
        "relative flex min-h-[min(100%,36rem)] flex-1 flex-col overflow-hidden rounded-bubble-xl",
        shake ? "animate-screen-shake" : "",
      ].join(" ")}
    >
      {/* Arena atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-[#1a2433] via-[#121820] to-[#0c1218]" />
        <div
          className={[
            "absolute inset-x-0 top-0 h-40 bg-linear-to-b to-transparent",
            accent.glow,
          ].join(" ")}
        />
        <div className="absolute -inset-s-16 top-1/3 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -inset-e-12 bottom-1/4 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
        <div
          className="absolute inset-x-6 bottom-24 h-20 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 14px, #fff 14px 15px)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-3.5 px-2.5 py-4">
        {/* HUD */}
        <header className="flex flex-col items-center gap-2.5 text-center">
          <div
            className={[
              "inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-[11px] font-extrabold uppercase tracking-wider ring-1",
              accent.badge,
            ].join(" ")}
          >
            <motion.span
              className={["h-2 w-2 rounded-full", accent.pulse].join(" ")}
              animate={{ opacity: [1, 0.4, 1], scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
            {title}
          </div>

          {subtitle && (
            <p className="max-w-xs font-body text-xs font-semibold text-white/55">
              {subtitle}
            </p>
          )}

          {/* Shot map */}
          <div className="flex w-full max-w-xs items-center gap-1.5 px-1">
            {Array.from({ length: total }, (_, i) => {
              const r = results[i];
              const current = i === index && !revealResult;
              const revealing = i === index && Boolean(revealResult);
              return (
                <div key={i} className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/12">
                  <motion.div
                    className={[
                      "absolute inset-y-0 inset-s-0 rounded-full",
                      r === true
                        ? "bg-emerald-400"
                        : r === false
                          ? "bg-rose-400"
                          : current || revealing
                            ? accent.bar
                            : "bg-transparent",
                    ].join(" ")}
                    initial={false}
                    animate={{
                      width:
                        r != null || current || revealing
                          ? "100%"
                          : "0%",
                      opacity: current ? [0.55, 1, 0.55] : 1,
                    }}
                    transition={
                      current
                        ? { opacity: { repeat: Infinity, duration: 1.1 } }
                        : { duration: 0.25 }
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 font-display text-sm font-black tabular-nums">
            <span className="text-white/80">
              {t("duel.qOf", {
                n: toLocaleDigits(index + 1, locale),
                total: toLocaleDigits(total, locale),
              })}
            </span>
            <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden />
            <span className={accent.score}>
              {t("duel.quizScore", {
                n: toLocaleDigits(goals, locale),
                total: toLocaleDigits(total, locale),
              })}
            </span>
          </div>
        </header>

        {/* Prompt */}
        <div className="relative flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-[#243041] to-[#171e29] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
            >
              <div
                aria-hidden
                className={[
                  "pointer-events-none absolute -inset-e-10 -top-12 h-32 w-32 rounded-full blur-3xl",
                  isAttack ? "bg-orange-400/20" : "bg-sky-400/20",
                ].join(" ")}
              />
              <p className="relative font-display text-lg font-black leading-snug text-white">
                {content.text}
              </p>
              <div className="relative">
                <FormatPrompt
                  type={q.type}
                  mediaUrl={q.mediaUrl}
                  careerPath={content.careerPath}
                  higherLower={content.higherLower}
                  cleared={Boolean(revealResult)}
                  resetKey={q.id}
                />
              </div>

              {/* Result flash on card edge */}
              <AnimatePresence>
                {revealResult === "goal" && (
                  <motion.div
                    key="goal-edge"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-emerald-400/70"
                  />
                )}
                {revealResult === "miss" && (
                  <motion.div
                    key="miss-edge"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-rose-400/70"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {revealResult === "goal" && <GoalBurst />}
            {revealResult === "miss" && (
              <motion.div
                key="miss-burst"
                className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ scale: 0.4, y: 20 }}
                  animate={{ scale: [0.4, 1.15, 1], y: [20, -8, -28] }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.85 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-4xl drop-shadow" aria-hidden>
                    🧤
                  </span>
                  <span className="font-display text-3xl font-black text-rose-400 drop-shadow">
                    {t("quiz.missed")}
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Answers */}
        <div className="flex flex-col gap-2.5">
          {content.options.map((label, i) => (
            <AnswerButton
              key={`${q.id}-${i}`}
              label={label}
              index={i}
              disabled={locked || Boolean(pending)}
              reveal={
                revealResult
                  ? {
                      selectedIndex,
                      correctIndex: q.correctIndex,
                      result: revealResult,
                    }
                  : null
              }
              onSelect={() => handleSelect(i)}
            />
          ))}
          <ExplanationFact
            explanation={q.explanation}
            visible={Boolean(revealResult)}
          />
        </div>
      </div>
    </section>
  );
}
