"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguageStore } from "@/stores/languageStore";
import {
  DEFAULT_LOCALE,
  getDirection,
  type Locale,
} from "./config";
import {
  getEnglishDictionary,
  loadDictionary,
  peekDictionary,
} from "./dictionaries";

type Params = Record<string, string | number>;

/** Resolve a dot-path (e.g. "quiz.kickOf" / "stadium.tiers.2") in a dictionary. */
function resolve(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Client translation hook. Returns `t()` plus the active locale/direction.
 * Falls back to English, then to the raw key, so a missing string is never
 * fatal to render.
 *
 * Locale from persist is applied only after mount so SSR + first paint match
 * (avoids hydration mismatches when the user saved `fa`). Persian dictionary
 * is lazy-loaded — English is used until that chunk arrives.
 */
export function useTranslation() {
  const storeLocale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const [hydrated, setHydrated] = useState(false);
  // Bump when a lazy dictionary finishes loading so `t` rebinds.
  const [dictVersion, setDictVersion] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const locale = (hydrated ? storeLocale : DEFAULT_LOCALE) as Locale;

  useEffect(() => {
    if (locale === DEFAULT_LOCALE) return;
    if (peekDictionary(locale)) return;
    let cancelled = false;
    void loadDictionary(locale).then(() => {
      if (!cancelled) setDictVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Params): string => {
      const en = getEnglishDictionary();
      const activeDict = peekDictionary(locale) ?? en;
      const active = resolve(activeDict, key);
      const value =
        typeof active === "string" ? active : resolve(en, key);
      if (typeof value !== "string") return key;
      return interpolate(value, params);
    },
    // dictVersion forces refresh after lazy fa chunk lands
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
    [locale, dictVersion],
  );

  return { t, locale, dir: getDirection(locale), setLocale };
}
