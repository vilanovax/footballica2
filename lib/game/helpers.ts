// In-match coin-spend helpers ("facilitators"). Framework-free so the SAME
// definitions + cost math run on the client (dock UI, optimistic spend) and the
// server (resolveMatch re-validates & deducts). Super-Power cards (post-MVP)
// will reuse the same effect keys with a different acquisition path.

import type { GameConfig } from "@/lib/game/economy";

export type HelperKey = "hint" | "extraTime" | "fifty" | "reroll";

/** Canonical dock order. */
export const HELPER_KEYS: HelperKey[] = ["hint", "extraTime", "fifty", "reroll"];

export type HelperMeta = {
  key: HelperKey;
  emoji: string;
  /** i18n key for the short button label. */
  labelKey: string;
  /** Wrong options this helper removes (0 = doesn't touch options). */
  removes: number;
};

export const HELPER_META: Record<HelperKey, HelperMeta> = {
  hint: { key: "hint", emoji: "🎙️", labelKey: "quiz.helpers.hint", removes: 1 },
  extraTime: { key: "extraTime", emoji: "⏱️", labelKey: "quiz.helpers.extraTime", removes: 0 },
  fifty: { key: "fifty", emoji: "🎥", labelKey: "quiz.helpers.fifty", removes: 2 },
  reroll: { key: "reroll", emoji: "🔁", labelKey: "quiz.helpers.reroll", removes: 0 },
};

export function isHelperKey(value: unknown): value is HelperKey {
  return (
    typeof value === "string" &&
    (HELPER_KEYS as string[]).includes(value)
  );
}

/** Coin cost of a single helper from the (live) config. */
export function helperCost(
  helpers: GameConfig["helpers"],
  key: HelperKey,
): number {
  return helpers[key];
}

/** Total coin cost of a list of used helpers (duplicates counted). */
export function totalHelperCost(
  helpers: GameConfig["helpers"],
  keys: HelperKey[],
): number {
  return keys.reduce((sum, k) => sum + (isHelperKey(k) ? helpers[k] : 0), 0);
}
