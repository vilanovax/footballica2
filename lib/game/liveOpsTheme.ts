/**
 * Live-Ops theme weeks (Phase C) — ADR 001/002.
 * Themes bias Survival / match draws toward visual formats.
 * They are NOT a new MatchMode / Play card.
 *
 * Canonical IDs: NONE | LOGO_WEEK | STADIUM_WEEK | CAREER_WEEK | FORMATS_WEEK
 * Short aliases (`logo`, `stadium`, …) still accepted for stored rows / admin UX.
 */

import type { QuizQuestionType } from "@/lib/quiz/types";
import { LIVEOPS_FORMAT_TYPES } from "@/lib/quiz/formatBias";

/** Canonical theme identifiers (product / Bias Engine). */
export const LIVEOPS_THEME_IDS = [
  "NONE",
  "LOGO_WEEK",
  "STADIUM_WEEK",
  "CAREER_WEEK",
  "FORMATS_WEEK",
] as const;

export type LiveOpsThemeId = (typeof LIVEOPS_THEME_IDS)[number];

/** Active themes (excludes NONE) — used by admin pickers. */
export const LIVEOPS_THEME_KEYS = [
  "logo",
  "stadium",
  "career",
  "formats",
] as const;

export type LiveOpsThemeKey = (typeof LIVEOPS_THEME_KEYS)[number];

export type FormatDrawBias = {
  preferredTypes: readonly QuizQuestionType[];
  /**
   * Density: 1 ≈ exclusive / always prefer formats when available.
   * Higher = softer bias (~1 format per N draws).
   */
  everyN: number;
  themeId: LiveOpsThemeId;
};

type ThemePreset = {
  id: LiveOpsThemeId;
  /** Short key stored in GameConfig / RecordChallenge.themeKey */
  key: LiveOpsThemeKey;
  labelEn: string;
  labelFa: string;
  preferredTypes: QuizQuestionType[];
  /** Heavy bias for visual weeks (Bias Engine). */
  formatBiasEveryN: number;
};

export const THEME_PRESETS: Record<LiveOpsThemeKey, ThemePreset> = {
  logo: {
    id: "LOGO_WEEK",
    key: "logo",
    labelEn: "Logo Week",
    labelFa: "هفته لوگو",
    preferredTypes: ["IMAGE", "REVEAL_IMAGE"],
    formatBiasEveryN: 1,
  },
  stadium: {
    id: "STADIUM_WEEK",
    key: "stadium",
    labelEn: "Stadium Week",
    labelFa: "هفته استادیوم",
    preferredTypes: ["IMAGE", "REVEAL_IMAGE"],
    formatBiasEveryN: 1,
  },
  career: {
    id: "CAREER_WEEK",
    key: "career",
    labelEn: "Career Path Week",
    labelFa: "هفته مسیر باشگاهی",
    preferredTypes: ["CAREER_PATH"],
    formatBiasEveryN: 1,
  },
  formats: {
    id: "FORMATS_WEEK",
    key: "formats",
    labelEn: "Format Festival",
    labelFa: "جشنواره فرمت‌ها",
    preferredTypes: [...LIVEOPS_FORMAT_TYPES],
    formatBiasEveryN: 2,
  },
};

const ALIAS_TO_KEY: Record<string, LiveOpsThemeKey> = {
  logo: "logo",
  logo_week: "logo",
  "logo-week": "logo",
  logo_week_id: "logo",
  LOGO_WEEK: "logo",
  stadium: "stadium",
  stadium_week: "stadium",
  "stadium-week": "stadium",
  STADIUM_WEEK: "stadium",
  career: "career",
  career_week: "career",
  "career-week": "career",
  CAREER_WEEK: "career",
  CAREER_PATH_WEEK: "career",
  formats: "formats",
  formats_week: "formats",
  "formats-week": "formats",
  FORMATS_WEEK: "formats",
  FORMAT_FESTIVAL: "formats",
};

const TYPE_SET = new Set<string>(LIVEOPS_FORMAT_TYPES);

/** Normalize raw theme string → short key, or null for NONE. */
export function normalizeThemeKey(raw: unknown): LiveOpsThemeKey | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "NONE" || upper === "OFF" || upper === "NULL") return null;
  if ((LIVEOPS_THEME_KEYS as readonly string[]).includes(trimmed)) {
    return trimmed as LiveOpsThemeKey;
  }
  return ALIAS_TO_KEY[trimmed] ?? ALIAS_TO_KEY[upper] ?? null;
}

export function themeIdFromKey(key: LiveOpsThemeKey | null): LiveOpsThemeId {
  if (!key) return "NONE";
  return THEME_PRESETS[key].id;
}

export function isLiveOpsThemeKey(raw: unknown): raw is LiveOpsThemeKey {
  return normalizeThemeKey(raw) !== null;
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

/**
 * Bias Engine entry — resolve draw bias from challenge override or global Live-Ops.
 * LOGO_WEEK / STADIUM_WEEK → IMAGE + REVEAL_IMAGE, everyN=1 (heavy).
 * CAREER_WEEK → CAREER_PATH, everyN=1.
 * NONE / empty → null (no theme bias; soft global format bias may still apply elsewhere).
 */
export function resolveThemeBias(input: {
  themeKey?: string | null;
  preferredTypes?: unknown;
  formatBiasEveryN?: number | null;
  fallbackEveryN?: number;
}): FormatDrawBias | null {
  const key = normalizeThemeKey(input.themeKey);
  const preset = key ? THEME_PRESETS[key] : null;
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
    themeId: themeIdFromKey(key),
  };
}

/** Active theme id for UI / logging. */
export function resolveLiveOpsThemeId(
  themeKey?: string | null,
): LiveOpsThemeId {
  return themeIdFromKey(normalizeThemeKey(themeKey));
}
