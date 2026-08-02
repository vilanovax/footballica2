/**
 * Live-Ops mode placement helpers (Duel draft tiles + GotD rotator).
 * Client-safe — no server-only imports.
 */

import type { GameConfig, LiveModeId, LiveModePlacement } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";

export type { LiveModeId, LiveModePlacement };

/** Stable display order for admin + rotator. */
export const LIVE_MODE_IDS: LiveModeId[] = [
  "mystery",
  "grid",
  "starPath",
  "memory",
  "tikiTaka",
];

export const LIVE_MODE_LABELS: Record<
  LiveModeId,
  { en: string; fa: string }
> = {
  mystery: { en: "Mystery Player", fa: "بازیکن مرموز" },
  grid: { en: "Football Grid", fa: "جدول فوتبال" },
  starPath: { en: "Star Path", fa: "مسیر ستاره" },
  memory: { en: "Memory Pairs", fa: "حافظه جفت‌ها" },
  tikiTaka: { en: "Tiki-Taka", fa: "تیکی‌تاکا" },
};

/** DuelRoundType values that count as the one-shot special. */
export type SpecialDuelRoundType =
  | "MEMORY"
  | "MYSTERY"
  | "GRID"
  | "STAR_PATH"
  | "TIKI_TAKA";

export const LIVE_MODE_TO_DUEL_TYPE: Record<LiveModeId, SpecialDuelRoundType> = {
  memory: "MEMORY",
  mystery: "MYSTERY",
  grid: "GRID",
  starPath: "STAR_PATH",
  tikiTaka: "TIKI_TAKA",
};

export const DUEL_TYPE_TO_LIVE_MODE: Record<SpecialDuelRoundType, LiveModeId> = {
  MEMORY: "memory",
  MYSTERY: "mystery",
  GRID: "grid",
  STAR_PATH: "starPath",
  TIKI_TAKA: "tikiTaka",
};

export function isSpecialDuelRoundType(
  t: string,
): t is SpecialDuelRoundType {
  return (
    t === "MEMORY" ||
    t === "MYSTERY" ||
    t === "GRID" ||
    t === "STAR_PATH" ||
    t === "TIKI_TAKA"
  );
}

/**
 * Always return a complete placement matrix. Older DB rows may omit newly
 * added modes (e.g. tikiTaka) — fill those from defaults so draft tiles appear.
 */
export function liveModesFromConfig(
  config: GameConfig = DEFAULT_GAME_CONFIG,
): GameConfig["liveModes"] {
  const lm = config.liveModes ?? DEFAULT_GAME_CONFIG.liveModes;
  const D = DEFAULT_GAME_CONFIG.liveModes;
  const out = { ...D };
  for (const id of LIVE_MODE_IDS) {
    const raw = lm[id];
    out[id] = {
      duel: typeof raw?.duel === "boolean" ? raw.duel : D[id].duel,
      gotd: typeof raw?.gotd === "boolean" ? raw.gotd : D[id].gotd,
    };
  }
  return out;
}

/** Modes currently allowed on the GotD rotator (stable order). */
export function gotdEnabledModes(
  config: GameConfig = DEFAULT_GAME_CONFIG,
): LiveModeId[] {
  const lm = liveModesFromConfig(config);
  return LIVE_MODE_IDS.filter((id) => lm[id].gotd);
}

/** Modes currently offered as duel specials. */
export function duelEnabledModes(
  config: GameConfig = DEFAULT_GAME_CONFIG,
): LiveModeId[] {
  const lm = liveModesFromConfig(config);
  return LIVE_MODE_IDS.filter((id) => lm[id].duel);
}

export function isLiveModeEnabledInDuel(
  mode: LiveModeId,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): boolean {
  return liveModesFromConfig(config)[mode].duel;
}

export function isLiveModeEnabledInGotd(
  mode: LiveModeId,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): boolean {
  return liveModesFromConfig(config)[mode].gotd;
}
