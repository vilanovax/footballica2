import en from "./locales/en";
import type { Dictionary } from "./locales/en";
import type { Locale } from "./config";

/**
 * Locale dictionary cache. English ships in the main client graph (fallback +
 * default SSR locale). Persian is code-split and loaded on demand (~56KB).
 */
const cache: Partial<Record<Locale, Dictionary>> = { en };

/** Sync read — returns undefined until a lazy locale has finished loading. */
export function peekDictionary(locale: Locale): Dictionary | undefined {
  return cache[locale];
}

/** Always-available English dictionary (eager). */
export function getEnglishDictionary(): Dictionary {
  return en;
}

/** Load (and cache) a locale dictionary. Safe to call repeatedly. */
export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  const hit = cache[locale];
  if (hit) return hit;

  if (locale === "fa") {
    const mod = await import("./locales/fa");
    cache.fa = mod.default;
    return mod.default;
  }

  cache.en = en;
  return en;
}
