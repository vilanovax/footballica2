"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { PlayModeEconomy, PlayModeId } from "@/lib/play/modeEconomy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import {
  GameChip,
  GameIconWell,
  GamePanel,
  GameTile,
  type GamePanelTone,
} from "@/components/ui/game";
import { cn } from "@/lib/utils";

function GameIcon({
  src,
  alt = "",
  className = "h-7 w-7",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={`object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)] ${className}`}
    />
  );
}

export type MatchCardTone = "penalty" | "quick" | "survival" | "duel";

const TONE: Record<
  MatchCardTone,
  {
    panel: GamePanelTone;
    cta: string;
    iconSrc: string;
    wash: string;
    amberWell?: boolean;
  }
> = {
  penalty: {
    panel: "emerald",
    cta: "game-cta game-cta-primary flex-1 font-display text-sm font-black",
    iconSrc: "/icons/target.png",
    wash: "bg-emerald-400/20",
  },
  quick: {
    panel: "emerald",
    cta: "game-cta game-cta-primary flex-1 font-display text-sm font-black",
    iconSrc: "/icons/energy.png",
    wash: "bg-lime-300/20",
  },
  survival: {
    panel: "rose",
    cta: "game-cta flex-1 bg-rose-500 font-display text-sm font-black text-white shadow-[0_5px_0_0_rgb(136,19,55)] active:shadow-[0_2px_0_0_rgb(136,19,55)]",
    iconSrc: "/icons/heart.png",
    wash: "bg-rose-400/20",
  },
  duel: {
    panel: "amber",
    cta: "game-cta game-cta-accent flex-1 font-display text-sm font-black",
    iconSrc: "/icons/trophy.png",
    wash: "bg-amber-300/20",
    amberWell: true,
  },
};

type MatchCardProps = {
  modeId: PlayModeId;
  href: string;
  title: string;
  blurb: string;
  ctaLabel: string;
  economy: PlayModeEconomy;
  /** Club-wide MAX(maxSurvivalScore). */
  survivalBest?: number | null;
  /** Live RecordChallenges count — shown on Survival card. */
  liveChallengeCount?: number;
  /** Your-turn pulse for Draft Duel. */
  urgentBadge?: string | null;
  tone: MatchCardTone;
};

/**
 * Dark game Match Card — Arena panel chrome, chip meta, CTA + info sheet.
 */
export function MatchCard({
  modeId,
  href,
  title,
  blurb,
  ctaLabel,
  economy,
  survivalBest = null,
  liveChallengeCount = 0,
  urgentBadge = null,
  tone,
}: MatchCardProps) {
  const { t, locale } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const style = TONE[tone];
  const urgent = Boolean(urgentBadge);

  function openInfo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    haptic(HAPTIC.light);
    playSound("click");
    setInfoOpen(true);
  }

  return (
    <>
      <GamePanel
        tone={style.panel}
        className={cn(
          "p-3.5",
          urgent &&
            "ring-2 ring-arena-amber shadow-[0_0_22px_rgba(251,191,36,0.28)]",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -end-10 -top-8 h-28 w-28 rounded-full blur-3xl",
            style.wash,
          )}
        />

        <div className="relative flex items-start gap-3">
          <span className="relative shrink-0" aria-hidden>
            <GameIconWell
              size="md"
              amber={style.amberWell}
              src={style.iconSrc}
              className="h-12 w-12"
              iconClassName="h-7 w-7"
            />
            {urgent ? (
              <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-display text-[10px] font-black text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                !
              </span>
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                {title}
              </h3>
              {urgentBadge ? (
                <GameChip tone="amber" className="uppercase tracking-wide">
                  {urgentBadge}
                </GameChip>
              ) : null}
            </div>
            <p className="mt-0.5 font-display text-xs font-bold text-white/55">
              {blurb}
            </p>
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap gap-1.5">
          <GameChip>
            <ResourceIcon kind="energy" size="sm" className="me-0.5" />
            {toLocaleDigits(economy.staminaCost, locale)}
          </GameChip>
          {modeId === "survival" ? (
            <>
              <GameChip>
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="coin" size="sm" />
                  {toLocaleDigits(economy.perCorrectCoins ?? 0, locale)}
                  <span aria-hidden>/</span>
                  <ResourceIcon kind="xp" size="sm" />
                  {toLocaleDigits(economy.perCorrectXp ?? 0, locale)}
                </span>
              </GameChip>
              <GameChip>
                {t("play.chipRecord", {
                  n: toLocaleDigits(survivalBest ?? 0, locale),
                })}
              </GameChip>
              {liveChallengeCount > 0 ? (
                <GameChip tone="amber">
                  <GameIcon
                    src="/icons/crown.png"
                    className="me-0.5 h-3.5 w-3.5"
                  />
                  {t("play.chipLiveChallenges", {
                    n: toLocaleDigits(liveChallengeCount, locale),
                  })}
                </GameChip>
              ) : null}
            </>
          ) : (
            <GameChip>
              <span className="inline-flex items-center gap-1">
                <ResourceIcon kind="coin" size="sm" />~
                {toLocaleDigits(economy.approxCoins, locale)}
                <span aria-hidden>+</span>
                <ResourceIcon kind="xp" size="sm" />
                {toLocaleDigits(economy.approxXp, locale)}
              </span>
            </GameChip>
          )}
          {modeId === "duel" && economy.duelWinWeeklyXp != null && (
            <GameChip tone="amber">
              <span className="inline-flex items-center gap-1">
                <ResourceIcon kind="xp" size="sm" />+
                {toLocaleDigits(economy.duelWinWeeklyXp, locale)}{" "}
                {t("play.info.weeklyXp")}
              </span>
            </GameChip>
          )}
        </div>

        <div className="relative mt-3 flex items-center gap-2">
          <Link
            href={href}
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.tap);
            }}
            className={style.cta}
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            aria-label={t("play.modeInfo")}
            onClick={openInfo}
            className="game-cta game-cta-ghost h-12 w-12 shrink-0 p-0"
          >
            <GameIcon src="/icons/help.png" className="h-8 w-8" />
          </button>
        </div>
      </GamePanel>

      <BottomSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={title}
        subtitle={blurb}
        closeLabel={t("common.close")}
        tone="dark"
      >
        <ModeInfoBody
          modeId={modeId}
          economy={economy}
          survivalBest={survivalBest}
        />
      </BottomSheet>
    </>
  );
}

/**
 * Unified game-style mode sheet: one rule line + 3 equal tiles.
 * Survival adds a compact hearts strip; no Live-Ops fine print.
 */
function ModeInfoBody({
  modeId,
  economy,
  survivalBest,
}: {
  modeId: PlayModeId;
  economy: PlayModeEconomy;
  survivalBest?: number | null;
}) {
  const { t, locale } = useTranslation();
  const n = (v: number) => toLocaleDigits(v, locale);
  const lives = economy.lives ?? 3;
  const isSurvival = modeId === "survival";

  const lengthLabel = isSurvival
    ? t("play.info.tileHearts")
    : modeId === "duel"
      ? t("play.info.tileRounds")
      : t("play.info.tileLength");

  const lengthValue = isSurvival
    ? n(lives)
    : modeId === "duel"
      ? n(2)
      : n(economy.questionCount ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-display text-sm font-bold leading-snug text-white/85">
        {t(`play.info.${modeId}.rules`)}
      </p>

      {isSurvival && (
        <GameTile tone="default" className="bg-rose-500/15 px-3 py-3 text-center shadow-[inset_0_0_0_1px_rgba(251,113,133,0.35)]">
          <div className="flex items-center justify-center gap-2" dir="ltr">
            {Array.from({ length: lives }, (_, i) => (
              <GameIconWell
                key={i}
                size="md"
                src="/icons/heart.png"
                className="h-10 w-10"
                iconClassName="h-6 w-6"
              />
            ))}
          </div>
          <p className="mt-2 font-display text-xs font-extrabold text-rose-200">
            {t("play.info.survival.missHeart")}
          </p>
          {survivalBest != null && survivalBest > 0 && (
            <p className="mt-1 inline-flex items-center justify-center gap-1 font-display text-[11px] font-bold text-white/55">
              <GameIcon src="/icons/trophy.png" className="h-3.5 w-3.5" />
              {t("play.info.survival.yourBest")}: {n(survivalBest)}
            </p>
          )}
        </GameTile>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label={t("play.info.tileEntry")}
          icon={<ResourceIcon kind="energy" size="md" />}
          value={n(economy.staminaCost)}
        />
        <StatTile
          label={lengthLabel}
          icon={
            isSurvival ? (
              <GameIcon src="/icons/heart.png" className="h-7 w-7" />
            ) : modeId === "duel" ? (
              <GameIcon src="/icons/trophy.png" className="h-7 w-7" />
            ) : (
              <GameIcon src="/icons/target.png" className="h-7 w-7" />
            )
          }
          value={lengthValue}
        />
        <StatTile
          label={t("play.info.tileReward")}
          icon={<ResourceIcon kind="coin" size="md" />}
          value={t("play.info.rewardLine", {
            coins: n(economy.approxCoins),
          })}
          sub={
            <span className="inline-flex items-center gap-0.5">
              <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
              {t("play.info.xpLine", { xp: n(economy.approxXp) })}
            </span>
          }
        />
      </div>

      {isSurvival && (
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center font-display text-[11px] font-bold leading-snug text-white/50">
          <span className="inline-flex items-center gap-0.5">
            <ResourceIcon kind="coin" size="sm" className="h-3.5 w-3.5" />
            {n(economy.perCorrectCoins ?? 0)}
            <span aria-hidden>/</span>
            <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
            {n(economy.perCorrectXp ?? 0)}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-0.5">
            <ResourceIcon kind="coin" size="sm" className="h-3.5 w-3.5" />
            {n(economy.clearedCoinBonus ?? 0)}
            <span aria-hidden>/</span>
            <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />
            {n(economy.clearedXpBonus ?? 0)}
          </span>
        </p>
      )}

      {modeId === "duel" && economy.duelWinWeeklyXp != null && (
        <p className="inline-flex w-full items-center justify-center gap-1 font-display text-[11px] font-bold text-white/50">
          <ResourceIcon kind="xp" size="sm" className="h-3.5 w-3.5" />+
          {n(economy.duelWinWeeklyXp)} {t("play.info.weeklyXp")}
        </p>
      )}
    </div>
  );
}

function StatTile({
  label,
  icon,
  value,
  sub,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  sub?: ReactNode;
}) {
  return (
    <GameTile className="flex flex-col items-center gap-1.5 px-2 py-3 text-center">
      <span className="font-display text-[10px] font-black uppercase tracking-wide text-white/45">
        {label}
      </span>
      <span className="flex h-7 items-center justify-center">{icon}</span>
      <span className="font-display text-base font-black tabular-nums leading-none text-white">
        {value}
      </span>
      {sub ? (
        <span className="font-display text-[10px] font-bold text-white/50">
          {sub}
        </span>
      ) : null}
    </GameTile>
  );
}
