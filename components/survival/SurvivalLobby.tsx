"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  PremiumChallenges,
  type PlayChallengeCard,
} from "@/components/play/PremiumChallenges";
import { TrophyShowcase } from "@/components/survival/TrophyShowcase";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import {
  GameChip,
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";

type SurvivalLobbyProps = {
  challenges: PlayChallengeCard[];
  coins: number;
  survivalBest: number;
};

/**
 * Survival hub — Arena chrome: classic run + trophy strip + live challenges.
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
      <GamePanel tone="rose" className="relative p-3.5 text-start">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-8 h-28 w-28 rounded-full bg-rose-400/25 blur-3xl"
        />
        <div className="relative flex items-start gap-3">
          <Link
            href="/play"
            aria-label={t("survival.backPlay")}
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.tap);
            }}
            className="order-last shrink-0 transition-transform active:scale-90"
          >
            <GameIconWell size="md" src="/icons/close.png" />
          </Link>
          <GameIconWell
            size="md"
            src="/icons/heart.png"
            className="h-12 w-12"
            iconClassName="h-7 w-7"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-bold uppercase tracking-widest text-rose-200/70">
              {t("survival.eyebrow")}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              {t("survival.lobbyTitle")}
            </h1>
            <p className="mt-1 font-display text-xs font-bold leading-snug text-white/65">
              {t("survival.lobbySub")}
            </p>
          </div>
        </div>
      </GamePanel>

      {/* Classic run */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GamePanel tone="rose" className="relative overflow-hidden p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -end-6 -top-8 h-28 w-28 rounded-full bg-rose-400/20 blur-2xl"
          />
          <div className="relative flex items-center gap-3">
            <GameIconWell
              size="lg"
              src="/icons/heart.png"
              className="h-14 w-14"
              iconClassName="h-8 w-8"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-extrabold text-white">
                {t("survival.classicTitle")}
              </h2>
              <p className="mt-0.5 font-display text-xs font-bold text-white/60">
                {t("survival.classicSub")}
              </p>
            </div>
          </div>

          <div className="relative mt-3 flex flex-wrap gap-1.5">
            <GameChip tone="amber" className="gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/energy.png"
                alt=""
                draggable={false}
                className="h-3.5 w-3.5 object-contain"
              />
              {toLocaleDigits(1, locale)}
            </GameChip>
            <GameChip tone="amber" className="gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/trophy.png"
                alt=""
                draggable={false}
                className="h-3.5 w-3.5 object-contain"
              />
              {toLocaleDigits(survivalBest, locale)}
            </GameChip>
            <GameChip>∞</GameChip>
          </div>

          <Link
            href="/play/survival?pick=1"
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.tap);
            }}
            className="game-cta game-cta-accent relative mt-3.5 flex w-full min-h-12 items-center justify-center text-sm"
          >
            {t("survival.classicCta")}
          </Link>
        </GamePanel>
      </motion.div>

      {liveCount > 0 ? <TrophyShowcase challenges={challenges} /> : null}

      {liveCount > 0 ? (
        <PremiumChallenges
          challenges={challenges}
          coins={coins}
          variant="lobby"
        />
      ) : (
        <p className="text-center font-display text-xs font-bold text-muted-foreground">
          {t("survival.noChallenges")}
        </p>
      )}
    </section>
  );
}
