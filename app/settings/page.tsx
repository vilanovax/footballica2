"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSound } from "@/lib/audio/useSound";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { logout } from "@/actions/auth";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { PushOptIn } from "@/components/pwa/PushOptIn";

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

function Pinstripe() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
      }}
      aria-hidden
    />
  );
}

function SettingsCard({
  children,
  tone = "emerald",
}: {
  children: React.ReactNode;
  tone?: "emerald" | "amber" | "sky" | "rose";
}) {
  const rim =
    tone === "amber"
      ? "border-amber-400/40"
      : tone === "sky"
        ? "border-sky-400/40"
        : tone === "rose"
          ? "border-rose-400/40"
          : "border-emerald-400/40";
  const wash =
    tone === "amber"
      ? "from-[#3d2a08] via-[#5c3d0a] to-[#0f172a]"
      : tone === "sky"
        ? "from-[#0c2d4a] via-[#134e75] to-[#0f172a]"
        : tone === "rose"
          ? "from-[#4c0519] via-[#7f1d1d] to-[#0f172a]"
          : "from-[#052e16] via-[#14532d] to-[#0f172a]";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-bubble-xl border-[3px] bg-linear-to-br p-4 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
        rim,
        wash,
      ].join(" ")}
    >
      <Pinstripe />
      <div className="relative">{children}</div>
    </div>
  );
}

function CardHeader({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 bg-black/30 text-xl shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-black text-white drop-shadow-sm">
            {title}
          </p>
          <p className="mt-0.5 font-display text-[11px] font-bold text-white/55">
            {desc}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

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
        "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-3 font-display text-sm font-black shadow-[0_3px_0_0_rgba(0,0,0,0.3)] transition-transform active:translate-y-px active:shadow-none",
        selected
          ? "border-accent bg-accent text-accent-foreground"
          : "border-white/15 bg-black/30 text-white/70",
      ].join(" ")}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="absolute top-1.5 inset-inline-end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/25 text-[11px] font-black"
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
    if (willUnmute) play("click");
  }

  function handleSetLocale(next: Locale) {
    if (next !== locale) play("click");
    setLocale(next);
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
    <section className="flex flex-1 flex-col gap-3 pb-4">
      <header className="relative overflow-hidden rounded-bubble-xl border-[3px] border-emerald-400/40 bg-linear-to-br from-[#052e16] via-[#14532d] to-[#0f172a] px-4 py-3.5 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]">
        <Pinstripe />
        <div className="relative">
          <p className="font-display text-[10px] font-black uppercase tracking-widest text-emerald-200/75">
            {t("settings.eyebrow")}
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-black text-white drop-shadow-sm">
            {t("settings.title")}
          </h1>
        </div>
      </header>

      <SettingsCard tone="emerald">
        <CardHeader
          icon="🌐"
          title={t("settings.language")}
          desc={t("settings.languageDesc")}
        />
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
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
      </SettingsCard>

      <SettingsCard tone="amber">
        <CardHeader
          icon="🎨"
          title={t("settings.theme")}
          desc={t("settings.themeDesc")}
        />
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
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
      </SettingsCard>

      <SettingsCard tone="sky">
        <CardHeader
          icon={soundOn ? "🔊" : "🔇"}
          title={t("settings.sound")}
          desc={t("settings.soundDesc")}
        >
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            onClick={handleToggleMute}
            className={[
              "relative flex h-11 w-20 shrink-0 items-center rounded-full border-2 px-1 shadow-[0_3px_0_0_rgba(0,0,0,0.3)] transition-colors",
              soundOn
                ? "justify-end border-accent bg-accent"
                : "justify-start border-white/15 bg-black/40",
            ].join(" ")}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-sm"
            >
              <span aria-hidden>{soundOn ? "🔊" : "🔇"}</span>
            </motion.span>
          </button>
        </CardHeader>

        <span
          className={[
            "mt-3 inline-flex items-center rounded-full px-3 py-1 font-display text-[11px] font-black",
            soundOn
              ? "bg-accent/25 text-amber-100 ring-1 ring-accent/40"
              : "bg-white/10 text-white/50 ring-1 ring-white/15",
          ].join(" ")}
        >
          {soundOn ? t("settings.on") : t("settings.off")}
        </span>
      </SettingsCard>

      <SettingsCard tone="sky">
        <CardHeader
          icon="🔔"
          title={t("settings.push")}
          desc={t("settings.pushDesc")}
        />
        <PushOptIn />
      </SettingsCard>

      <SettingsCard tone="rose">
        <CardHeader
          icon="🚪"
          title={t("settings.account")}
          desc={t("settings.accountDesc")}
        />
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="mt-3.5 flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-rose-300/50 bg-rose-500/25 font-display text-base font-black text-rose-100 shadow-[0_3px_0_0_rgba(0,0,0,0.3)] transition-transform active:translate-y-px active:shadow-none disabled:opacity-60"
        >
          {loggingOut ? t("settings.loggingOut") : t("settings.logout")}
        </button>
      </SettingsCard>

      <footer className="mt-auto pt-2 text-center">
        <p className="font-display text-lg font-black tracking-wide text-emerald-800/70">
          Footballica
        </p>
        <p className="mt-0.5 font-display text-[11px] font-bold text-muted-foreground">
          {t("settings.tagline")}
        </p>
        <p className="mt-1 font-display text-[11px] font-bold tabular-nums text-muted-foreground/70">
          v0.1.0
        </p>
      </footer>
    </section>
  );
}
