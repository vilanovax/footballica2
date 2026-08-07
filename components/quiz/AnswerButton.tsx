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

  let stateClass =
    "bg-black/40 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_4px_0_0_rgba(0,0,0,0.35)]";
  if (showEliminated) {
    stateClass =
      "bg-white/5 text-white/35 line-through opacity-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]";
  } else if (reveal) {
    if (isCorrect) {
      stateClass =
        "bg-linear-to-b from-emerald-500 to-emerald-800 text-white shadow-[0_0_0_1px_rgba(52,211,153,0.55),0_4px_0_0_rgba(0,0,0,0.4),0_0_18px_rgba(52,211,153,0.3)]";
    } else if (isPickedWrong) {
      stateClass =
        "bg-linear-to-b from-rose-500 to-rose-800 text-white shadow-[0_0_0_1px_rgba(251,113,133,0.5),0_4px_0_0_rgba(0,0,0,0.4)]";
    } else {
      stateClass =
        "bg-white/5 text-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] opacity-70";
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
              y: 3,
            }
      }
      animate={
        isCorrect
          ? { scale: [1, 1.04, 1] }
          : isPickedWrong
            ? { x: [0, -8, 8, -6, 6, 0] }
            : { scale: 1, x: 0 }
      }
      transition={{ duration: isPickedWrong ? 0.4 : 0.35 }}
      className={[
        "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-start font-display text-base font-black transition-colors duration-200",
        stateClass,
      ].join(" ")}
    >
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-black",
          reveal && isCorrect
            ? "bg-black/30 text-white"
            : reveal && isPickedWrong
              ? "bg-black/30 text-white"
              : "bg-emerald-500 text-white shadow-[0_2px_0_0_rgba(0,0,0,0.35)]",
        ].join(" ")}
      >
        {letters[index]}
      </span>
      <span className="flex-1">{label}</span>

      {isCorrect && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/icons/trophy.png"
          alt=""
          aria-hidden
          draggable={false}
          className="h-5 w-5 object-contain"
        />
      )}
      {isPickedWrong && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/icons/broken-heart.png"
          alt=""
          aria-hidden
          draggable={false}
          className="h-5 w-5 object-contain"
        />
      )}
    </motion.button>
  );
}
