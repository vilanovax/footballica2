"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { DailyMysterySnapshot } from "@/actions/mystery/getDailyMystery";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  mystery: DailyMysterySnapshot | null;
};

/**
 * Rotating Live-Ops slot on Match Day — first occupant: Mysterious Player.
 * Not a permanent fifth core mode (see ADR 001).
 */
export function GameOfTheDayCard({ mystery }: Props) {
  const { t, locale } = useTranslation();
  if (!mystery) return null;

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
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {t("play.gameOfTheDay")}
      </h2>
      <article className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-linear-to-br from-amber-500/15 via-surface to-primary/10 p-4 shadow-fantasy">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/mystery.png"
            alt=""
            aria-hidden
            draggable={false}
            className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-black text-foreground">
              {t("play.mysteryTitle")}
            </p>
            <p className="mt-0.5 font-body text-sm font-bold text-foreground/75">
              {blurb}
            </p>
            <p className="mt-1 font-display text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {done
                ? t("mystery.streak", {
                    n: toLocaleDigits(mystery.mysteryStreak, locale),
                  })
                : t("mystery.guessesLeft", {
                    cur: toLocaleDigits(mystery.guessCount, locale),
                    max: toLocaleDigits(mystery.maxGuesses, locale),
                  })}
              {!done && mystery.mysteryStreak > 0
                ? ` · ${t("mystery.streak", {
                    n: toLocaleDigits(mystery.mysteryStreak, locale),
                  })}`
                : null}
            </p>
          </div>
        </div>
        <motion.div className="mt-3" whileTap={{ y: 3 }}>
          <Link
            href="/play/mystery"
            onClick={() => playSound("click")}
            className="btn-fantasy btn-fantasy-primary flex w-full min-h-touch items-center justify-center"
          >
            {cta}
          </Link>
        </motion.div>
      </article>
    </div>
  );
}
