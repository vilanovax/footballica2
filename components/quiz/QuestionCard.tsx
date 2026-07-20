"use client";

import { motion } from "framer-motion";

type QuestionCardProps = {
  /** Localized question text for the active language. */
  text: string;
  /** Localized category label. */
  category: string;
};

export function QuestionCard({ text, category }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="rounded-bubble-lg border border-border bg-surface p-5 shadow-fantasy-lg"
    >
      <span className="inline-block rounded-full bg-muted px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {category}
      </span>
      <p className="mt-3 font-display text-xl font-bold leading-snug text-surface-foreground">
        {text}
      </p>
    </motion.div>
  );
}
