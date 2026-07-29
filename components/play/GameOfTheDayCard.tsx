"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { DailyMysterySnapshot } from "@/actions/mystery/getDailyMystery";
import type { DailyGridSnapshot } from "@/actions/grid/getDailyGrid";
import { gameOfTheDayKind } from "@/lib/grid/gotd";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  mystery: DailyMysterySnapshot | null;
  grid?: DailyGridSnapshot | null;
};

/**
 * Rotating Live-Ops slot — Mystery or Football Grid (ADR 001 / 002).
 * Not a permanent fifth core mode.
 */
export function GameOfTheDayCard({ mystery, grid = null }: Props) {
  const { t, locale } = useTranslation();
  const dateKey = grid?.dateKey ?? mystery?.dateKey ?? "";
  const kind = gameOfTheDayKind(dateKey || "2026-01-01");

  if (kind === "grid" && grid) {
    return <GridGotdCard grid={grid} />;
  }
  if (mystery) {
    return <MysteryGotdCard mystery={mystery} />;
  }
  if (grid) {
    return <GridGotdCard grid={grid} />;
  }
  return null;
}

function MysteryGotdCard({ mystery }: { mystery: DailyMysterySnapshot }) {
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
      eyebrow={t("play.gameOfTheDay")}
    />
  );
}

function GridGotdCard({ grid }: { grid: DailyGridSnapshot }) {
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
      icon="/icons/guesses.png"
      title={t("play.gridTitle")}
      blurb={blurb}
      meta={`${toLocaleDigits(grid.filled, locale)}/${toLocaleDigits(grid.totalCells, locale)} · 🔥 ${toLocaleDigits(grid.gridStreak, locale)}`}
      href="/play/grid"
      cta={cta}
      eyebrow={t("play.gameOfTheDay")}
    />
  );
}

function GotdShell({
  icon,
  title,
  blurb,
  meta,
  href,
  cta,
  eyebrow,
}: {
  icon: string;
  title: string;
  blurb: string;
  meta: string;
  href: string;
  cta: string;
  eyebrow: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {eyebrow}
      </h2>
      <article className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-linear-to-br from-amber-500/15 via-surface to-primary/10 p-4 shadow-fantasy">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={icon}
            alt=""
            aria-hidden
            draggable={false}
            className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-black text-foreground">
              {title}
            </p>
            <p className="mt-0.5 font-body text-sm font-bold text-foreground/75">
              {blurb}
            </p>
            <p className="mt-1 font-display text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {meta}
            </p>
          </div>
        </div>
        <motion.div className="mt-3" whileTap={{ y: 3 }}>
          <Link
            href={href}
            onClick={() => playSound("click")}
            className="btn-fantasy btn-fantasy-accent flex min-h-11 w-full items-center justify-center gap-2 font-display text-sm font-extrabold"
          >
            <span aria-hidden>▶</span>
            {cta}
          </Link>
        </motion.div>
      </article>
    </div>
  );
}
