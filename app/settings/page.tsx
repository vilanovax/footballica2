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
import {
  GameChip,
  GameCta,
  GameIconWell,
  GamePanel,
  GameTile,
  type GamePanelTone,
} from "@/components/ui/game";

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

function SectionHeader({
  iconSrc,
  title,
  desc,
  children,
}: {
  iconSrc: string;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <GameIconWell size="md" src={iconSrc} />
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

function OptionTile({
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
      className="min-h-14 text-start"
    >
      <GameTile
        tone={selected ? "amber" : "default"}
        className={[
          "relative flex h-full flex-col items-center justify-center gap-1 px-3 py-3",
          selected ? "ring-1 ring-amber-300/45" : "",
        ].join(" ")}
      >
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute top-1.5 inset-inline-end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/35 text-[11px] font-black text-amber-100"
            aria-hidden
          >
            ✓
          </motion.span>
        )}
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span
          className={[
            "font-display text-sm font-black",
            selected ? "text-white" : "text-white/70",
          ].join(" ")}
        >
          {label}
        </span>
      </GameTile>
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

  const sections: {
    tone: GamePanelTone;
    key: string;
    node: React.ReactNode;
  }[] = [
    {
      key: "lang",
      tone: "emerald",
      node: (
        <>
          <SectionHeader
            iconSrc="/icons/hub-settings.png"
            title={t("settings.language")}
            desc={t("settings.languageDesc")}
          />
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            {LOCALES.map((code) => (
              <OptionTile
                key={code}
                selected={locale === code}
                onClick={() => handleSetLocale(code)}
                icon={LOCALE_LABEL[code].flag}
                label={LOCALE_LABEL[code].native}
              />
            ))}
          </div>
        </>
      ),
    },
    {
      key: "theme",
      tone: "amber",
      node: (
        <>
          <SectionHeader
            iconSrc="/icons/mystery.png"
            title={t("settings.theme")}
            desc={t("settings.themeDesc")}
          />
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <OptionTile
              selected={theme === "day"}
              onClick={() => applyTheme("day")}
              icon="☀️"
              label={t("settings.day")}
            />
            <OptionTile
              selected={theme === "dark"}
              onClick={() => applyTheme("dark")}
              icon="🌙"
              label={t("settings.night")}
            />
          </div>
        </>
      ),
    },
    {
      key: "sound",
      tone: "sky",
      node: (
        <>
          <SectionHeader
            iconSrc="/icons/energy.png"
            title={t("settings.sound")}
            desc={t("settings.soundDesc")}
          >
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              onClick={handleToggleMute}
              className={[
                "relative flex h-11 w-20 shrink-0 items-center rounded-full px-1 ring-1 transition-colors",
                soundOn
                  ? "justify-end bg-accent ring-amber-300/50"
                  : "justify-start bg-black/40 ring-white/15",
              ].join(" ")}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-sm"
              >
                <span aria-hidden>{soundOn ? "🔊" : "🔇"}</span>
              </motion.span>
            </button>
          </SectionHeader>
          <GameChip
            tone={soundOn ? "amber" : "default"}
            className="mt-3"
          >
            {soundOn ? t("settings.on") : t("settings.off")}
          </GameChip>
        </>
      ),
    },
    {
      key: "push",
      tone: "sky",
      node: (
        <>
          <SectionHeader
            iconSrc="/icons/hub-news.png"
            title={t("settings.push")}
            desc={t("settings.pushDesc")}
          />
          <PushOptIn />
        </>
      ),
    },
    {
      key: "account",
      tone: "rose",
      node: (
        <>
          <SectionHeader
            iconSrc="/icons/close.png"
            title={t("settings.account")}
            desc={t("settings.accountDesc")}
          />
          <GameCta
            variant="danger"
            block
            disabled={loggingOut}
            onClick={handleLogout}
            className="mt-3.5"
          >
            {loggingOut ? t("settings.loggingOut") : t("settings.logout")}
          </GameCta>
        </>
      ),
    },
  ];

  return (
    <section className="flex flex-1 flex-col gap-3 pb-4">
      <GamePanel tone="emerald" className="px-4 py-3.5">
        <p className="font-display text-[10px] font-black uppercase tracking-widest text-emerald-200/80">
          {t("settings.eyebrow")}
        </p>
        <h1 className="mt-0.5 font-display text-2xl font-black text-white drop-shadow-sm">
          {t("settings.title")}
        </h1>
      </GamePanel>

      {sections.map((s) => (
        <GamePanel key={s.key} tone={s.tone} className="p-4">
          {s.node}
        </GamePanel>
      ))}

      <footer className="mt-auto pt-2 text-center">
        <p className="font-display text-lg font-black tracking-wide text-emerald-700/80">
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
