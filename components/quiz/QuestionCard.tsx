"use client";

import { motion } from "framer-motion";
import { Flag } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CareerPathPayload, HigherLowerPayload } from "@/lib/quiz/formats";
import type { QuizQuestionType } from "@/lib/quiz/types";
import { FormatPrompt } from "./FormatPrompt";

type QuestionCardProps = {
  /** Localized question text for the active language. */
  text: string;
  /** Localized category label. */
  category: string;
  /** Opens the report flow (modal is owned by the match, above the options). */
  onReport: () => void;
  type?: QuizQuestionType;
  mediaUrl?: string | null;
  careerPath?: CareerPathPayload;
  higherLower?: HigherLowerPayload;
  /** Snap progressive image reveal when the kick is locked. */
  imageCleared?: boolean;
  /** Stable id for REVEAL_IMAGE remount / restart. */
  questionId?: string;
};

export function QuestionCard({
  text,
  category,
  onReport,
  type,
  mediaUrl,
  careerPath,
  higherLower,
  imageCleared,
  questionId,
}: QuestionCardProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative rounded-bubble-lg border border-border bg-surface p-5 shadow-fantasy-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-block rounded-full bg-muted px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {category}
        </span>
        <button
          type="button"
          aria-label={t("report.flag")}
          title={t("report.flag")}
          onClick={onReport}
          className="-me-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-destructive"
        >
          <Flag className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
      <p className="mt-3 font-display text-xl font-bold leading-snug text-surface-foreground">
        {text}
      </p>
      <FormatPrompt
        type={type}
        mediaUrl={mediaUrl}
        careerPath={careerPath}
        higherLower={higherLower}
        cleared={imageCleared}
        resetKey={questionId}
      />
    </motion.div>
  );
}
