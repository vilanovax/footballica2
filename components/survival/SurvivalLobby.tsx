"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import {
  PremiumChallenges,
  type PlayChallengeCard,
} from "@/components/play/PremiumChallenges";
import { TrophyShowcase } from "@/components/survival/TrophyShowcase";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type SurvivalLobbyProps = {
  challenges: PlayChallengeCard[];
  coins: number;
  survivalBest: number;
};

/**
 * Gamified Survival hub (no PNG frames):
 * header · classic card · trophy strip · live challenges.
 */
export function SurvivalLobby({
  challenges,
  coins,
  survivalBest,
}: SurvivalLobbyProps) {
  const { t, locale } = useTranslation();
  const liveCount = challenges.length;

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <header className="relative px-1 pt-1 text-center">
        <Link
          href="/play"
          aria-label={t("survival.backPlay")}
          onClick={() => {
            playSound("click");
            haptic(HAPTIC.tap);
          }}
          className="absolute end-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-surface text-muted-foreground shadow-fantasy-sm transition-colors active:bg-muted active:text-foreground"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </Link>
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-destructive">
          {t("survival.eyebrow")}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
          {t("survival.lobbyTitle")}
        </h1>
        <p className="mx-auto mt-1 max-w-[16rem] font-body text-xs font-semibold text-muted-foreground">
          {t("survival.lobbySub")}
        </p>
      </header>

      {/* Classic — CSS card, no frame asset */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-bubble-xl border-2 border-destructive/35 bg-linear-to-br from-destructive/20 via-destructive/8 to-surface p-4 shadow-fantasy"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -end-6 -top-8 h-28 w-28 rounded-full bg-destructive/15 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-10 bottom-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
        />

        <div className="relative flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-destructive text-3xl text-destructive-foreground shadow-fantasy-sm ring-2 ring-destructive/30"
            aria-hidden
          >
            ❤️
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-foreground">
              {t("survival.classicTitle")}
            </h2>
            <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
              {t("survival.classicSub")}
            </p>
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap gap-1.5">
          <MetaChip>⚡ {toLocaleDigits(1, locale)}</MetaChip>
          <MetaChip>🏆 {toLocaleDigits(survivalBest, locale)}</MetaChip>
          <MetaChip>∞</MetaChip>
        </div>

        <Link
          href="/play/survival?pick=1"
          onClick={() => {
            playSound("click");
            haptic(HAPTIC.tap);
          }}
          className="btn-fantasy btn-fantasy-secondary relative mt-3.5 flex w-full min-h-12! items-center justify-center py-2.5! text-sm"
        >
          {t("survival.classicCta")}
        </Link>
      </motion.div>

      {liveCount > 0 ? <TrophyShowcase challenges={challenges} /> : null}

      {liveCount > 0 ? (
        <PremiumChallenges
          challenges={challenges}
          coins={coins}
          variant="lobby"
        />
      ) : (
        <p className="text-center font-body text-xs font-semibold text-muted-foreground">
          {t("survival.noChallenges")}
        </p>
      )}
    </section>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center rounded-full border border-white/40 bg-surface/90 px-2.5 py-1 font-display text-xs font-extrabold text-foreground shadow-fantasy-sm">
      {children}
    </span>
  );
}
