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
import type { DuelAnswerSubmission } from "@/lib/duel/types";

type DuelQuizProps = {
  title: string;
  subtitle?: string;
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
  questions,
  pending,
  onComplete,
}: DuelQuizProps) {
  const { t, locale } = useTranslation();
  const lang = useLanguageStore((s) => s.locale);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DuelAnswerSubmission[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealResult, setRevealResult] = useState<"goal" | "miss" | null>(
    null,
  );
  const [locked, setLocked] = useState(false);
  const [qStartedAt, setQStartedAt] = useState(() => performance.now());

  const q = questions[index];
  if (!q) return null;

  const content = q.content[lang] ?? q.content.en;
  const total = questions.length;

  function handleSelect(selectedIndex: number) {
    if (locked || pending || !q) return;
    setLocked(true);
    const correct = selectedIndex === q.correctIndex;
    const entry: DuelAnswerSubmission = {
      questionId: q.id,
      selectedIndex,
      ms: Math.round(performance.now() - qStartedAt),
    };
    const nextAnswers = [...answers, entry];
    setAnswers(nextAnswers);
    setSelectedIndex(selectedIndex);
    setRevealResult(correct ? "goal" : "miss");
    if (correct) {
      playSound("goal");
      haptic(HAPTIC.goal);
    } else {
      playSound("miss");
      haptic(HAPTIC.miss);
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
    <section className="flex flex-1 flex-col gap-4">
      <header className="text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          {title}
        </p>
        {subtitle && (
          <p className="mt-1 font-body text-sm font-semibold text-muted-foreground">
            {subtitle}
          </p>
        )}
        <p className="mt-2 font-display text-xs font-bold text-muted-foreground">
          {t("duel.qOf", {
            n: toLocaleDigits(index + 1, locale),
            total: toLocaleDigits(total, locale),
          })}
        </p>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          className="rounded-bubble-lg border border-border bg-surface p-5 shadow-fantasy-lg"
        >
          <p className="font-display text-lg font-bold leading-snug text-surface-foreground">
            {content.text}
          </p>
          <FormatPrompt
            type={q.type}
            mediaUrl={q.mediaUrl}
            careerPath={content.careerPath}
            higherLower={content.higherLower}
            cleared={Boolean(revealResult)}
            resetKey={q.id}
          />
        </motion.div>
      </AnimatePresence>

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
    </section>
  );
}
