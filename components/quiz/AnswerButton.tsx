"use client";

import { motion } from "framer-motion";
import type { KickResult } from "@/lib/quiz/types";

type AnswerButtonProps = {
  label: string;
  index: number;
  disabled: boolean;
  /** Set once the kick is revealed. */
  reveal: {
    selectedIndex: number | null;
    correctIndex: number;
    result: KickResult;
  } | null;
  onSelect: (index: number) => void;
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function AnswerButton({
  label,
  index,
  disabled,
  reveal,
  onSelect,
}: AnswerButtonProps) {
  const isCorrect = reveal ? index === reveal.correctIndex : false;
  const isPickedWrong =
    reveal !== null &&
    reveal.selectedIndex === index &&
    index !== reveal.correctIndex;

  // Base (unrevealed) vs revealed states drive color tokens.
  let stateClass =
    "bg-surface text-surface-foreground shadow-fantasy border-border";
  if (reveal) {
    if (isCorrect) {
      stateClass =
        "bg-primary text-primary-foreground border-primary-deep shadow-glow";
    } else if (isPickedWrong) {
      stateClass =
        "bg-destructive text-destructive-foreground border-destructive shadow-fantasy";
    } else {
      stateClass = "bg-muted text-muted-foreground border-border opacity-60";
    }
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(index)}
      whileTap={disabled ? undefined : { y: 6, boxShadow: "2px 2px 0px hsl(var(--shadow-ink) / 0.2)" }}
      animate={
        isCorrect
          ? { scale: [1, 1.06, 1] }
          : isPickedWrong
            ? { x: [0, -8, 8, -6, 6, 0] }
            : { scale: 1, x: 0 }
      }
      transition={{ duration: isPickedWrong ? 0.4 : 0.35 }}
      className={[
        "flex min-h-touch w-full items-center gap-3 rounded-bubble border px-4 py-4 text-left font-body text-base font-bold",
        "transition-colors duration-200",
        stateClass,
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold",
          reveal && isCorrect
            ? "bg-primary-foreground/20"
            : reveal && isPickedWrong
              ? "bg-destructive-foreground/20"
              : "bg-muted text-muted-foreground",
        ].join(" ")}
      >
        {OPTION_LETTERS[index]}
      </span>
      <span className="flex-1">{label}</span>

      {isCorrect && <span aria-hidden className="text-xl">⚽️</span>}
      {isPickedWrong && <span aria-hidden className="text-xl">🧤</span>}
    </motion.button>
  );
}
