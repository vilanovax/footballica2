/**
 * Live-Ops theme weeks (Phase C) — ADR 001/002.
 * Themes bias draws toward visual formats; they are NOT a new MatchMode.
 */

import type { QuizQuestionType } from "@/lib/quiz/types";
import { LIVEOPS_FORMAT_TYPES } from "@/lib/quiz/formatBias";

export const LIVEOPS_THEME_KEYS = [
  "logo",
  "stadium",
  "career",
  "formats",
] as const;

export type LiveOpsThemeKey = (typeof LIVEOPS_THEME_KEYS)[number];

export type FormatDrawBias = {
  preferredTypes: readonly QuizQuestionType[];
  everyN: number;
};

export const THEME_PRESETS: Record<
  LiveOpsThemeKey,
  {
    labelEn: string;
    labelFa: string;
    preferredTypes: QuizQuestionType[];
    formatBiasEveryN: number;
  }
> = {
  logo: {
    labelEn: "Logo Week",
    labelFa: "هفته لوگو",
    preferredTypes: ["IMAGE", "REVEAL_IMAGE"],
    formatBiasEveryN: 2,
  },
  stadium: {
    labelEn: "Stadium Week",
    labelFa: "هفته استادیوم",
    preferredTypes: ["IMAGE", "REVEAL_IMAGE"],
    formatBiasEveryN: 2,
  },
  career: {
    labelEn: "Career Path Week",
    labelFa: "هفته مسیر باشگاهی",
    preferredTypes: ["CAREER_PATH"],
    formatBiasEveryN: 2,
  },
  formats: {
    labelEn: "Format Festival",
    labelFa: "جشنواره فرمت‌ها",
    preferredTypes: [...LIVEOPS_FORMAT_TYPES],
    formatBiasEveryN: 2,
  },
};

const TYPE_SET = new Set<string>(LIVEOPS_FORMAT_TYPES);

export function isLiveOpsThemeKey(raw: unknown): raw is LiveOpsThemeKey {
  return (
    typeof raw === "string" &&
    (LIVEOPS_THEME_KEYS as readonly string[]).includes(raw)
  );
}

export function parsePreferredTypes(raw: unknown): QuizQuestionType[] {
  if (!Array.isArray(raw)) return [];
  const out: QuizQuestionType[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (!TYPE_SET.has(item)) continue;
    if (!out.includes(item as QuizQuestionType)) {
      out.push(item as QuizQuestionType);
    }
  }
  return out;
}

export function resolveThemeBias(input: {
  themeKey?: string | null;
  preferredTypes?: unknown;
  formatBiasEveryN?: number | null;
  fallbackEveryN?: number;
}): FormatDrawBias | null {
  const preset = isLiveOpsThemeKey(input.themeKey)
    ? THEME_PRESETS[input.themeKey]
    : null;
  const preferred = parsePreferredTypes(input.preferredTypes);
  const types =
    preferred.length > 0
      ? preferred
      : preset
        ? preset.preferredTypes
        : [];

  if (types.length === 0) return null;

  const everyRaw =
    typeof input.formatBiasEveryN === "number" &&
    Number.isFinite(input.formatBiasEveryN)
      ? Math.round(input.formatBiasEveryN)
      : (preset?.formatBiasEveryN ?? input.fallbackEveryN ?? 5);

  return {
    preferredTypes: types,
    everyN: Math.min(20, Math.max(1, everyRaw)),
  };
}
