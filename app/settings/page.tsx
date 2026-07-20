"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSound } from "@/lib/audio/useSound";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LOCALES, type Locale } from "@/lib/i18n/config";

type Theme = "day" | "dark";

function getTheme(): Theme {
  if (typeof document === "undefined") return "day";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "day";
}

const LOCALE_LABEL: Record<Locale, { native: string; flag: string }> = {
  en: { native: "English", flag: "🇬🇧" },
  fa: { native: "فارسی", flag: "🇮🇷" },
};

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("day");
  const { isMuted, toggleMute, play } = useSound();
  const { t, locale, setLocale } = useTranslation();
  // Avoid hydration mismatch: mute state comes from persisted client storage.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getTheme());
    setMounted(true);
  }, []);

  function handleToggleMute() {
    const willUnmute = isMuted;
    toggleMute();
    // Play a confirmation click when turning sound ON.
    if (willUnmute) play("click");
  }

  function handleSetLocale(next: Locale) {
    if (next !== locale) play("click");
    setLocale(next);
  }

  const soundOn = mounted ? !isMuted : true;

  function applyTheme(next: Theme) {
    setTheme(next);
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="pt-2">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          {t("settings.eyebrow")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          {t("settings.title")}
        </h1>
      </header>

      <div className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy">
        <p className="font-display text-lg font-bold text-surface-foreground">
          {t("settings.language")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.languageDesc")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {LOCALES.map((code) => {
            const selected = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSetLocale(code)}
                aria-pressed={selected}
                className={[
                  "btn-fantasy min-h-touch flex-col gap-1 rounded-bubble border px-3 py-4 font-display text-sm font-bold",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-btn-3d"
                    : "border-border bg-muted text-muted-foreground shadow-fantasy-sm",
                ].join(" ")}
              >
                <span className="text-2xl" aria-hidden>
                  {LOCALE_LABEL[code].flag}
                </span>
                <span>{LOCALE_LABEL[code].native}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy">
        <p className="font-display text-lg font-bold text-surface-foreground">
          {t("settings.theme")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.themeDesc")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => applyTheme("day")}
            className={[
              "btn-fantasy min-h-touch rounded-bubble border px-3 py-4 font-display text-sm font-bold",
              theme === "day"
                ? "border-primary bg-primary text-primary-foreground shadow-btn-3d"
                : "border-border bg-muted text-muted-foreground shadow-fantasy-sm",
            ].join(" ")}
          >
            {t("settings.day")}
          </button>
          <button
            type="button"
            onClick={() => applyTheme("dark")}
            className={[
              "btn-fantasy min-h-touch rounded-bubble border px-3 py-4 font-display text-sm font-bold",
              theme === "dark"
                ? "border-primary bg-primary text-primary-foreground shadow-btn-3d"
                : "border-border bg-muted text-muted-foreground shadow-fantasy-sm",
            ].join(" ")}
          >
            {t("settings.night")}
          </button>
        </div>
      </div>

      <div className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-surface-foreground">
              {t("settings.sound")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("settings.soundDesc")}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            onClick={handleToggleMute}
            className={[
              "relative flex h-11 w-20 shrink-0 items-center rounded-full border px-1 font-display text-xs font-bold transition-colors",
              soundOn
                ? "justify-end border-primary bg-primary text-primary-foreground shadow-btn-3d"
                : "justify-start border-border bg-muted text-muted-foreground shadow-fantasy-sm",
            ].join(" ")}
          >
            <span className="absolute left-3 text-sm" aria-hidden>
              {soundOn ? "" : "🔇"}
            </span>
            <span className="absolute right-3 text-sm" aria-hidden>
              {soundOn ? "🔊" : ""}
            </span>
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="h-9 w-9 rounded-full bg-surface shadow-fantasy-sm"
            />
          </button>
        </div>

        <p className="mt-3 font-display text-sm font-bold text-muted-foreground">
          {soundOn ? t("settings.on") : t("settings.off")}
        </p>
      </div>
    </section>
  );
}
