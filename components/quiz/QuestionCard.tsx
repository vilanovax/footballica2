"use client";

import { motion } from "framer-motion";
import type { QuizQuestion } from "@/lib/quiz/types";

type QuestionCardProps = {
  question: QuizQuestion;
};

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="rounded-bubble-lg border border-border bg-surface p-5 shadow-fantasy-lg"
    >
      <span className="inline-block rounded-full bg-muted px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {question.category}
      </span>
      <p className="mt-3 font-display text-xl font-bold leading-snug text-surface-foreground">
        {question.questionText}
      </p>
    </motion.div>
  );
}
