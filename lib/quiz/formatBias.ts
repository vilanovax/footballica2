/**
 * Live-Ops format bias for question draws (ADR 001).
 * Non-TEXT types are rare in a TEXT-heavy bank — reserve ~1 slot per N draws
 * when a format question is available. Pure helper (no I/O).
 *
 * Theme weeks (Phase C) may narrow the preferred type set and tighten everyN.
 */

import type { QuizQuestionType } from "./types";

/** QuestionTypes that benefit from Live-Ops visibility bias. */
export const LIVEOPS_FORMAT_TYPES: readonly QuizQuestionType[] = [
  "IMAGE",
  "CAREER_PATH",
  "HIGHER_LOWER",
  "REVEAL_IMAGE",
] as const;

/** Aim for ~1 format question per this many drawn (Penalty/Quick = 5 → 1). */
export const FORMAT_BIAS_EVERY_N = 5;

export type FormatBiasOptions = {
  /** Subset of format types to prefer (theme week). Default = all Live-Ops formats. */
  preferredTypes?: readonly QuizQuestionType[];
  /** Density knob (1 = always try format first). Default {@link FORMAT_BIAS_EVERY_N}. */
  everyN?: number;
};

export function resolvePreferredFormatTypes(
  preferred?: readonly QuizQuestionType[] | null,
): readonly QuizQuestionType[] {
  if (preferred && preferred.length > 0) return preferred;
  return LIVEOPS_FORMAT_TYPES;
}

export function isLiveOpsFormatType(
  type: string | null | undefined,
  preferred?: readonly QuizQuestionType[] | null,
): boolean {
  if (!type) return false;
  return (resolvePreferredFormatTypes(preferred) as readonly string[]).includes(
    type,
  );
}

/**
 * How many format slots to reserve for a draw of `count`.
 * - count 5 → 1, count 10 → 2
 * - short draws (&lt; 4) → 0 (don't force formats into tutorials of 1–3)
 */
export function formatBiasQuota(
  count: number,
  everyN: number = FORMAT_BIAS_EVERY_N,
): number {
  const n = Math.max(0, Math.floor(count));
  if (n <= 0 || everyN <= 0) return 0;
  const base = Math.floor(n / everyN);
  if (n >= 4 && base === 0) return 1;
  return base;
}

/**
 * Soft per-pick bias for progressive/survival draws: with probability ~1/N,
 * try a format candidate before falling back to the full tier pool.
 */
export function shouldPreferFormatPick(
  rng: () => number = Math.random,
  everyN: number = FORMAT_BIAS_EVERY_N,
): boolean {
  if (everyN <= 1) return true;
  return rng() < 1 / everyN;
}
