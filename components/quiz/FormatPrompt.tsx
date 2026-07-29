"use client";

import type { CareerPathPayload, HigherLowerPayload } from "@/lib/quiz/formats";
import type { QuizQuestionType } from "@/lib/quiz/types";
import { CareerPathPrompt } from "./CareerPathPrompt";
import { ImagePrompt } from "./ImagePrompt";
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
    return <ImagePrompt src={mediaUrl} />;
  }

  if (type === "CAREER_PATH" && careerPath?.steps?.length) {
    return <CareerPathPrompt careerPath={careerPath} />;
  }

  if (type === "HIGHER_LOWER" && higherLower) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-center font-display text-xs font-bold uppercase tracking-wide text-accent">
          {higherLower.metricLabel}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <EntityCard entity={higherLower.left} />
          <div className="flex items-center justify-center font-display text-sm font-black text-accent">
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
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-linear-to-b from-[#243044] to-[#141b27] px-2 py-3 text-center shadow-[0_4px_14px_rgba(0,0,0,0.3)]">
      {entity.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entity.imageUrl}
          alt=""
          draggable={false}
          className="h-12 w-12 rounded-full object-cover ring-1 ring-white/15"
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xl ring-1 ring-primary/30">
          ⚽
        </span>
      )}
      <span className="line-clamp-2 font-display text-xs font-extrabold leading-tight text-white/95">
        {entity.name}
      </span>
    </div>
  );
}
