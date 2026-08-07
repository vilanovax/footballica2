"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { playSound } from "@/lib/audio/SoundManager";
import {
  THEME_PRESETS,
  isLiveOpsThemeKey,
  type LiveOpsThemeKey,
} from "@/lib/game/liveOpsTheme";

export type ThemeWeekBannerProps = {
  themeKey: string | null;
  titleEn: string;
  titleFa: string;
  blurbEn: string;
  blurbFa: string;
  /** Deep-link when a themed RecordChallenge is live. */
  href?: string;
  ctaLabel?: string;
};

/**
 * Play-screen Live-Ops banner for an active theme week (Phase C).
 * Not a permanent mode card — sits above Match Cards / GotD.
 */
export function ThemeWeekBanner({
  themeKey,
  titleEn,
  titleFa,
  blurbEn,
  blurbFa,
  href = "/play/survival",
  ctaLabel,
}: ThemeWeekBannerProps) {
  const { t, locale } = useTranslation();
  if (!themeKey && !titleEn && !titleFa) return null;

  const key: LiveOpsThemeKey | null = isLiveOpsThemeKey(themeKey)
    ? themeKey
    : null;
  const preset = key ? THEME_PRESETS[key] : null;
  const title =
    (locale === "fa" ? titleFa || titleEn : titleEn || titleFa) ||
    preset?.labelEn ||
    t("play.themeWeek");
  const blurb =
    (locale === "fa" ? blurbFa || blurbEn : blurbEn || blurbFa) ||
    t("play.themeWeekBlurb");

  return (
    <article className="relative overflow-hidden rounded-3xl border border-amber-400/45 bg-linear-to-br from-amber-500/20 via-surface to-secondary/10 p-4 shadow-fantasy">
      <p className="font-display text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-200">
        {t("play.themeWeek")}
      </p>
      <p className="mt-1 font-display text-lg font-black text-foreground">
        {title}
      </p>
      <p className="mt-0.5 font-body text-sm font-bold text-foreground/75">
        {blurb}
      </p>
      <motion.div className="mt-3" whileTap={{ y: 3 }}>
        <Link
          href={href}
          onClick={() => playSound("click")}
          className="game-cta game-cta-accent flex min-h-11 w-full items-center justify-center gap-2 font-display text-sm font-extrabold"
        >
          {ctaLabel ?? t("play.themeWeekCta")}
        </Link>
      </motion.div>
    </article>
  );
}
