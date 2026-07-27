"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSound } from "@/lib/audio/useSound";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { logout } from "@/actions/auth";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

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

/** Section header: tinted icon badge + title + description. */
function CardHeader({
  icon,
  tint,
  title,
  desc,
  children,
}: {
  icon: string;
  tint: string;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-bubble text-xl ${tint}`}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-surface-foreground">
            {title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Chunky selectable pill with icon + label and a check badge when active. */
function OptionButton({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "btn-fantasy min-h-touch relative flex-col gap-1 rounded-bubble border px-3 py-4 font-display text-sm font-bold",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-btn-3d"
          : "border-border bg-muted text-muted-foreground shadow-fantasy-sm",
      ].join(" ")}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="absolute top-1.5 inset-inline-end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-[11px] font-black text-primary shadow-fantasy-sm"
          aria-hidden
        >
          ✓
        </motion.span>
      )}
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("day");
  const { isMuted, toggleMute, play } = useSound();
  const { t, locale, setLocale } = useTranslation();
  // Avoid hydration mismatch: mute state comes from persisted client storage.
  const [mounted, setMounted] = useState(false);
  const [loggingOut, startLogout] = useTransition();

  useEffect(() => {
    setTheme(getTheme());
    setMounted(true);
  }, []);

  function handleLogout() {
    if (loggingOut) return;
    startLogout(async () => {
      play("click");
      haptic(HAPTIC.light);
      await logout();
      router.replace("/login");
      router.refresh();
    });
  }

  function handleToggleMute() {
    const willUnmute = isMuted;
    toggleMute();
    // Play a confirmation click when turning sound ON.
    if (willUnmute) play("click");
  }

  function handleSetLocale(next: Locale) {
    if (next !== locale) play("click");
    setLocale(next);
    // Server pickers (Survival / Duel) read locale from cookie.
    router.refresh();
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
        <CardHeader
          icon="🌐"
          tint="bg-secondary/15"
          title={t("settings.language")}
          desc={t("settings.languageDesc")}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {LOCALES.map((code) => (
            <OptionButton
              key={code}
              selected={locale === code}
              onClick={() => handleSetLocale(code)}
              icon={LOCALE_LABEL[code].flag}
              label={LOCALE_LABEL[code].native}
            />
          ))}
        </div>
      </div>

      <div className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy">
        <CardHeader
          icon="🎨"
          tint="bg-accent/15"
          title={t("settings.theme")}
          desc={t("settings.themeDesc")}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <OptionButton
            selected={theme === "day"}
            onClick={() => applyTheme("day")}
            icon="☀️"
            label={t("settings.day")}
          />
          <OptionButton
            selected={theme === "dark"}
            onClick={() => applyTheme("dark")}
            icon="🌙"
            label={t("settings.night")}
          />
        </div>
      </div>

      <div className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy">
        <CardHeader
          icon={soundOn ? "🔊" : "🔇"}
          tint="bg-primary/15"
          title={t("settings.sound")}
          desc={t("settings.soundDesc")}
        >
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            onClick={handleToggleMute}
            className={[
              "relative flex h-11 w-20 shrink-0 items-center rounded-full border px-1 transition-colors",
              soundOn
                ? "justify-end border-primary bg-primary shadow-btn-3d"
                : "justify-start border-border bg-muted shadow-fantasy-sm",
            ].join(" ")}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-sm shadow-fantasy-sm"
            >
              <span aria-hidden>{soundOn ? "🔊" : "🔇"}</span>
            </motion.span>
          </button>
        </CardHeader>

        <span
          className={[
            "mt-4 inline-flex items-center rounded-full px-3 py-1 font-display text-xs font-bold",
            soundOn
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {soundOn ? t("settings.on") : t("settings.off")}
        </span>
      </div>

      <div className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy">
        <CardHeader
          icon="🚪"
          tint="bg-destructive/10"
          title={t("settings.account")}
          desc={t("settings.accountDesc")}
        />
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="btn-fantasy mt-4 flex min-h-touch w-full items-center justify-center border-2 border-destructive/40 bg-destructive/10 font-display text-base font-bold text-destructive transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loggingOut ? t("settings.loggingOut") : t("settings.logout")}
        </button>
      </div>

      <footer className="mt-auto pt-4 text-center">
        <p className="font-display text-lg font-black tracking-wide text-primary/70">
          Footballica
        </p>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
          {t("settings.tagline")}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-muted-foreground/70 tabular-nums">
          v0.1.0
        </p>
      </footer>
    </section>
  );
}
