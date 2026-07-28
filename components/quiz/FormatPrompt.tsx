"use client";

import type { CareerPathPayload, HigherLowerPayload } from "@/lib/quiz/formats";
import type { QuizQuestionType } from "@/lib/quiz/types";
import { RevealImage } from "./RevealImage";

type Props = {
  type?: QuizQuestionType;
  mediaUrl?: string | null;
  careerPath?: CareerPathPayload;
  higherLower?: HigherLowerPayload;
  /** Answer locked / revealed — snap REVEAL_IMAGE to sharp. */
  cleared?: boolean;
  /** Question id so progressive reveal restarts per item. */
  resetKey?: string;
};

/**
 * Visual prompt layer for non-TEXT formats (ADR 001).
 * TEXT renders nothing here — the question text stays in QuestionCard.
 */
export function FormatPrompt({
  type,
  mediaUrl,
  careerPath,
  higherLower,
  cleared,
  resetKey,
}: Props) {
  if (type === "REVEAL_IMAGE") {
    if (!mediaUrl) return null;
    return (
      <RevealImage src={mediaUrl} cleared={cleared} resetKey={resetKey} />
    );
  }

  if (type === "IMAGE") {
    if (!mediaUrl) return null;
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt=""
          className="mx-auto max-h-48 w-full object-contain"
        />
      </div>
    );
  }

  if (type === "CAREER_PATH" && careerPath?.steps?.length) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {careerPath.steps.map((step, i) => (
          <div key={`${step.name}-${i}`} className="flex items-center gap-1.5">
            <div className="flex min-w-[4.5rem] max-w-[7rem] flex-col items-center gap-1 rounded-2xl border border-border bg-muted/50 px-2 py-2 shadow-fantasy-sm">
              {step.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={step.logoUrl}
                  alt=""
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <span className="text-lg" aria-hidden>
                  🏟️
                </span>
              )}
              <span className="line-clamp-2 text-center font-display text-[10px] font-bold leading-tight text-foreground">
                {step.name}
              </span>
            </div>
            {i < careerPath.steps.length - 1 && (
              <span className="font-display text-sm font-black text-muted-foreground">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (type === "HIGHER_LOWER" && higherLower) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-center font-display text-xs font-bold uppercase tracking-wide text-primary">
          {higherLower.metricLabel}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <EntityCard entity={higherLower.left} />
          <div className="flex items-center justify-center font-display text-lg font-black text-muted-foreground">
            VS
          </div>
          <EntityCard entity={higherLower.right} />
        </div>
      </div>
    );
  }

  return null;
}

function EntityCard({
  entity,
}: {
  entity: { name: string; imageUrl?: string | null };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/45 px-2 py-3 text-center shadow-fantasy-sm">
      {entity.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entity.imageUrl}
          alt=""
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-xl shadow-fantasy-sm">
          ⚽
        </span>
      )}
      <span className="line-clamp-2 font-display text-xs font-extrabold leading-tight text-foreground">
        {entity.name}
      </span>
    </div>
  );
}
