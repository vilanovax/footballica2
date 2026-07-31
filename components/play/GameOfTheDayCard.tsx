"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { DailyMysterySnapshot } from "@/actions/mystery/getDailyMystery";
import type { DailyGridSnapshot } from "@/actions/grid/getDailyGrid";
import type { DailyStarPathSnapshot } from "@/actions/starpath/getDailyStarPath";
import {
  gameOfTheDayKind,
  gameOfTheDayRotation,
  type GameOfTheDayKind,
} from "@/lib/grid/gotd";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  mystery: DailyMysterySnapshot | null;
  grid?: DailyGridSnapshot | null;
  starPath?: DailyStarPathSnapshot | null;
  /** ISO timestamp — next Tehran midnight (GotD rotate). */
  rotatesAt?: string | null;
};

/**
 * Rotating Live-Ops slot — Mystery / Grid / Star Path (day % 3).
 * ADR 001 / 002 — not a permanent fifth core mode.
 */
export function GameOfTheDayCard({
  mystery,
  grid = null,
  starPath = null,
  rotatesAt = null,
}: Props) {
  const dateKey =
    starPath?.dateKey ?? grid?.dateKey ?? mystery?.dateKey ?? "";
  const kind = gameOfTheDayKind(dateKey || "2026-01-01");
  const rotateIso =
    rotatesAt ?? gameOfTheDayRotation().rotatesAt.toISOString();

  if (kind === "starPath" && starPath) {
    return <StarPathGotdCard starPath={starPath} rotatesAt={rotateIso} />;
  }
  if (kind === "grid" && grid) {
    return <GridGotdCard grid={grid} rotatesAt={rotateIso} />;
  }
  if (kind === "mystery" && mystery) {
    return <MysteryGotdCard mystery={mystery} rotatesAt={rotateIso} />;
  }
  // Fallback if preferred snapshot missing but another exists.
  if (starPath) {
    return <StarPathGotdCard starPath={starPath} rotatesAt={rotateIso} />;
  }
  if (mystery) {
    return <MysteryGotdCard mystery={mystery} rotatesAt={rotateIso} />;
  }
  if (grid) {
    return <GridGotdCard grid={grid} rotatesAt={rotateIso} />;
  }
  return null;
}

function MysteryGotdCard({
  mystery,
  rotatesAt,
}: {
  mystery: DailyMysterySnapshot;
  rotatesAt: string;
}) {
  const { t, locale } = useTranslation();
  const done = mystery.status === "SOLVED" || mystery.status === "FAILED";
  const started = mystery.guessCount > 0;

  const blurb = done
    ? t("play.mysteryBlurbDone", {
        n: toLocaleDigits(mystery.mysteryStreak, locale),
      })
    : t("play.mysteryBlurb", {
        n: toLocaleDigits(mystery.maxGuesses, locale),
      });

  const cta = done
    ? t("play.mysteryCtaResult")
    : started
      ? t("play.mysteryCtaContinue")
      : t("play.mysteryCta");

  return (
    <GotdShell
      kind="mystery"
      icon="/icons/mystery.png"
      title={t("play.mysteryTitle")}
      blurb={blurb}
      meta={
        done
          ? t("mystery.streak", {
              n: toLocaleDigits(mystery.mysteryStreak, locale),
            })
          : t("mystery.guessesLeft", {
              cur: toLocaleDigits(mystery.guessCount, locale),
              max: toLocaleDigits(mystery.maxGuesses, locale),
            })
      }
      href="/play/mystery"
      cta={cta}
      rotatesAt={rotatesAt}
    />
  );
}

function StarPathGotdCard({
  starPath,
  rotatesAt,
}: {
  starPath: DailyStarPathSnapshot;
  rotatesAt: string;
}) {
  const { t, locale } = useTranslation();
  const done =
    starPath.status === "SOLVED" || starPath.status === "FAILED";
  const started =
    starPath.guesses.length > 0 || starPath.cluesRevealed > 1;

  const blurb = done
    ? t("play.starPathBlurbDone", {
        n: toLocaleDigits(starPath.starPathStreak, locale),
      })
    : t("play.starPathBlurb", {
        n: toLocaleDigits(starPath.maxClues, locale),
      });

  const cta = done
    ? t("play.starPathCtaResult")
    : started
      ? t("play.starPathCtaContinue")
      : t("play.starPathCta");

  return (
    <GotdShell
      kind="starPath"
      icon="/icons/streak.png"
      title={t("play.starPathTitle")}
      blurb={blurb}
      meta={
        done
          ? `⭐ ${toLocaleDigits(starPath.score, locale)} · 🔥 ${toLocaleDigits(starPath.starPathStreak, locale)}`
          : t("starPath.pathLabel", {
              n: toLocaleDigits(starPath.cluesRevealed, locale),
              max: toLocaleDigits(starPath.maxClues, locale),
            })
      }
      href="/play/star-path"
      cta={cta}
      rotatesAt={rotatesAt}
    />
  );
}

function GridGotdCard({
  grid,
  rotatesAt,
}: {
  grid: DailyGridSnapshot;
  rotatesAt: string;
}) {
  const { t, locale } = useTranslation();
  const done = grid.status === "SOLVED" || grid.status === "FAILED";
  const started = grid.filled > 0 || grid.mistakeCount > 0;

  const blurb = done
    ? t("play.gridBlurbDone", {
        n: toLocaleDigits(grid.gridStreak, locale),
      })
    : t("play.gridBlurb", {
        n: toLocaleDigits(grid.maxMistakes, locale),
      });

  const cta = done
    ? t("play.gridCtaResult")
    : started
      ? t("play.gridCtaContinue")
      : t("play.gridCta");

  return (
    <GotdShell
      kind="grid"
      icon="/icons/guesses.png"
      title={t("play.gridTitle")}
      blurb={blurb}
      meta={`${toLocaleDigits(grid.filled, locale)}/${toLocaleDigits(grid.totalCells, locale)} · 🔥 ${toLocaleDigits(grid.gridStreak, locale)}`}
      href="/play/grid"
      cta={cta}
      rotatesAt={rotatesAt}
    />
  );
}

function GotdShell({
  kind,
  icon,
  title,
  blurb,
  meta,
  href,
  cta,
  rotatesAt,
}: {
  kind: GameOfTheDayKind;
  icon: string;
  title: string;
  blurb: string;
  meta: string;
  href: string;
  cta: string;
  rotatesAt: string;
}) {
  const { t } = useTranslation();
  const countdown = useGotdCountdown(rotatesAt);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-amber-700/90 dark:text-amber-300/90">
          {t("play.gameOfTheDay")}
        </h2>
        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-display text-[10px] font-extrabold text-amber-900 ring-1 ring-amber-400/40 dark:text-amber-100">
          {kind === "mystery"
            ? t("play.gotdKindMystery")
            : kind === "grid"
              ? t("play.gotdKindGrid")
              : t("play.gotdKindStarPath")}
        </span>
      </div>

      <article className="relative overflow-hidden rounded-[1.75rem] border-2 border-amber-400/50 bg-linear-to-br from-amber-400/25 via-surface to-primary/15 p-4 shadow-[0_10px_28px_rgba(180,120,20,0.22)] ring-1 ring-amber-200/40">
        {/* Spotlight wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-amber-300/25 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -start-6 h-32 w-32 rounded-full bg-primary/20 blur-2xl"
        />

        <div className="relative flex items-start gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={icon}
            alt=""
            aria-hidden
            draggable={false}
            className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-black leading-tight text-foreground">
              {title}
            </p>
            <p className="mt-1 font-body text-sm font-bold text-foreground/75">
              {blurb}
            </p>
            <p className="mt-1.5 font-display text-[11px] font-bold text-amber-800 dark:text-amber-200">
              {meta}
            </p>
          </div>
        </div>

        <p className="relative mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-black/5 px-3 py-2 text-center font-display text-xs font-extrabold tabular-nums text-foreground/80 ring-1 ring-black/5 dark:bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/timer.png"
            alt=""
            aria-hidden
            draggable={false}
            className="h-5 w-5 object-contain"
          />
          {t("play.gotdRotatesIn", { time: countdown })}
        </p>

        <motion.div className="relative mt-3" whileTap={{ y: 3 }}>
          <Link
            href={href}
            onClick={() => playSound("click")}
            className="btn-fantasy btn-fantasy-accent flex min-h-12 w-full items-center justify-center gap-2 font-display text-base font-extrabold shadow-fantasy"
          >
            <span aria-hidden>▶</span>
            {cta}
          </Link>
        </motion.div>
      </article>
    </div>
  );
}

function useGotdCountdown(rotatesAtIso: string): string {
  const { locale } = useTranslation();
  const [msLeft, setMsLeft] = useState(() =>
    Math.max(0, new Date(rotatesAtIso).getTime() - Date.now()),
  );

  useEffect(() => {
    const target = new Date(rotatesAtIso).getTime();
    const tick = () => setMsLeft(Math.max(0, target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [rotatesAtIso]);

  return formatCountdown(msLeft, locale);
}

function formatCountdown(ms: number, locale: Locale): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => toLocaleDigits(String(n).padStart(2, "0"), locale);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
