"use client";

import { motion } from "framer-motion";
import type { KickResult } from "@/lib/quiz/types";
import { useTranslation } from "@/lib/i18n/useTranslation";

type AnswerButtonProps = {
  label: string;
  index: number;
  disabled: boolean;
  /** Removed by a 50/50 / Hint helper — faded, struck-through, unclickable. */
  eliminated?: boolean;
  /** Set once the kick is revealed. */
  reveal: {
    selectedIndex: number | null;
    correctIndex: number;
    result: KickResult;
  } | null;
  onSelect: (index: number) => void;
};

// Locale-aware option badges so the labels feel native (A–D vs الف–د).
const OPTION_LETTERS: Record<string, string[]> = {
  en: ["A", "B", "C", "D"],
  fa: ["الف", "ب", "ج", "د"],
};

export function AnswerButton({
  label,
  index,
  disabled,
  eliminated = false,
  reveal,
  onSelect,
}: AnswerButtonProps) {
  const { locale } = useTranslation();
  const letters = OPTION_LETTERS[locale] ?? OPTION_LETTERS.en;
  const isCorrect = reveal ? index === reveal.correctIndex : false;
  const isPickedWrong =
    reveal !== null &&
    reveal.selectedIndex === index &&
    index !== reveal.correctIndex;
  // Eliminated only matters BEFORE reveal (reveal styling wins afterwards).
  const showEliminated = eliminated && !reveal;

  // Base (unrevealed) vs revealed states drive color tokens. The thick bottom
  // border + hard shadow give a chunky, physically-pressable plastic feel.
  let stateClass =
    "bg-surface text-surface-foreground shadow-fantasy border-border border-b-black/25";
  if (showEliminated) {
    stateClass =
      "bg-muted text-muted-foreground border-border border-b-black/10 opacity-40 line-through";
  } else if (reveal) {
    if (isCorrect) {
      stateClass =
        "bg-primary text-primary-foreground border-primary-deep border-b-primary-deep shadow-glow";
    } else if (isPickedWrong) {
      stateClass =
        "bg-destructive text-destructive-foreground border-destructive border-b-black/30 shadow-fantasy";
    } else {
      stateClass =
        "bg-muted text-muted-foreground border-border border-b-black/15 opacity-60";
    }
  }

  const inactive = disabled || showEliminated;

  return (
    <motion.button
      type="button"
      disabled={inactive}
      onClick={() => onSelect(index)}
      whileTap={
        inactive
          ? undefined
          : {
              y: 6,
              boxShadow:
                "0 0 22px hsl(var(--primary) / 0.55), 2px 2px 0px hsl(var(--shadow-ink) / 0.2)",
            }
      }
      animate={
        isCorrect
          ? { scale: [1, 1.06, 1] }
          : isPickedWrong
            ? { x: [0, -8, 8, -6, 6, 0] }
            : { scale: 1, x: 0 }
      }
      transition={{ duration: isPickedWrong ? 0.4 : 0.35 }}
      className={[
        "flex min-h-touch w-full items-center gap-3 rounded-bubble border-2 border-b-4 px-4 py-4 text-start font-body text-base font-bold",
        "transition-colors duration-200",
        stateClass,
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold shadow-fantasy-sm",
          reveal && isCorrect
            ? "bg-primary-foreground/20 text-primary-foreground"
            : reveal && isPickedWrong
              ? "bg-destructive-foreground/20 text-destructive-foreground"
              : "bg-primary text-primary-foreground",
        ].join(" ")}
      >
        {letters[index]}
      </span>
      <span className="flex-1">{label}</span>

      {isCorrect && <span aria-hidden className="text-xl">⚽️</span>}
      {isPickedWrong && <span aria-hidden className="text-xl">🧤</span>}
    </motion.button>
  );
}
