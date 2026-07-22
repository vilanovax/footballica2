"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguageStore } from "@/stores/languageStore";
import {
  DICTIONARIES,
  DEFAULT_LOCALE,
  getDirection,
  type Locale,
} from "./config";

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
 * (avoids hydration mismatches when the user saved `fa`).
 */
export function useTranslation() {
  const storeLocale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const locale = (hydrated ? storeLocale : DEFAULT_LOCALE) as Locale;

  const t = useCallback(
    (key: string, params?: Params): string => {
      const active = resolve(DICTIONARIES[locale], key);
      const value =
        typeof active === "string"
          ? active
          : resolve(DICTIONARIES[DEFAULT_LOCALE], key);
      if (typeof value !== "string") return key;
      return interpolate(value, params);
    },
    [locale],
  );

  return { t, locale, dir: getDirection(locale), setLocale };
}
