"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { PlayModeEconomy, PlayModeId } from "@/lib/play/modeEconomy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { ResourceIcon } from "@/components/common/ResourceIcon";

export type MatchCardTone = "penalty" | "quick" | "survival" | "duel";

const TONE: Record<
  MatchCardTone,
  { tint: string; iconBg: string; cta: string; icon: string }
> = {
  penalty: {
    tint: "border-secondary/25 bg-secondary/8",
    iconBg: "bg-secondary text-secondary-foreground",
    cta: "btn-fantasy-secondary",
    icon: "🧤",
  },
  quick: {
    tint: "border-primary/25 bg-primary/8",
    iconBg: "bg-primary text-primary-foreground",
    cta: "btn-fantasy-primary",
    icon: "⚡",
  },
  survival: {
    tint: "border-destructive/20 bg-destructive/8",
    iconBg: "bg-destructive text-destructive-foreground",
    cta: "btn-fantasy-secondary",
    icon: "❤️",
  },
  duel: {
    tint: "border-accent/30 bg-accent/10",
    iconBg: "bg-accent text-accent-foreground",
    cta: "btn-fantasy-accent",
    icon: "⚔️",
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
  tone: MatchCardTone;
};

/**
 * Phase 1 Match Card — light tint, chip meta, 1-click CTA + [i] → BottomSheet.
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
  tone,
}: MatchCardProps) {
  const { t, locale } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const style = TONE[tone];

  function openInfo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    haptic(HAPTIC.light);
    playSound("click");
    setInfoOpen(true);
  }

  return (
    <>
      <article
        className={[
          "rounded-bubble-xl border p-3.5 shadow-fantasy-sm",
          style.tint,
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <span
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-bubble text-2xl shadow-fantasy-sm",
              style.iconBg,
            ].join(" ")}
            aria-hidden
          >
            {style.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-foreground">
              {title}
            </h3>
            <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
              {blurb}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip>
            <ResourceIcon kind="energy" size="sm" className="me-1" />
            {toLocaleDigits(economy.staminaCost, locale)}
          </Chip>
          {modeId === "survival" ? (
            <>
              <Chip>
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="coin" size="sm" />
                  {toLocaleDigits(economy.perCorrectCoins ?? 0, locale)}
                  <span aria-hidden>/</span>
                  <ResourceIcon kind="xp" size="sm" />
                  {toLocaleDigits(economy.perCorrectXp ?? 0, locale)}
                </span>
              </Chip>
              <Chip>
                {t("play.chipRecord", {
                  n: toLocaleDigits(survivalBest ?? 0, locale),
                })}
              </Chip>
              {liveChallengeCount > 0 ? (
                <Chip>
                  👑{" "}
                  {t("play.chipLiveChallenges", {
                    n: toLocaleDigits(liveChallengeCount, locale),
                  })}
                </Chip>
              ) : null}
            </>
          ) : (
            <Chip>
              <span className="inline-flex items-center gap-1">
                <ResourceIcon kind="coin" size="sm" />~
                {toLocaleDigits(economy.approxCoins, locale)}
                <span aria-hidden>+</span>
                <ResourceIcon kind="xp" size="sm" />
                {toLocaleDigits(economy.approxXp, locale)}
              </span>
            </Chip>
          )}
          {modeId === "duel" && economy.duelWinWeeklyXp != null && (
            <Chip>
              <span className="inline-flex items-center gap-1">
                <ResourceIcon kind="xp" size="sm" />+
                {toLocaleDigits(economy.duelWinWeeklyXp, locale)}{" "}
                {t("play.info.weeklyXp")}
              </span>
            </Chip>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Link
            href={href}
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.tap);
            }}
            className={["btn-fantasy flex-1 min-h-12! py-2.5! text-sm", style.cta].join(
              " ",
            )}
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            aria-label={t("play.modeInfo")}
            onClick={openInfo}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-bubble border border-border bg-surface text-muted-foreground shadow-fantasy-sm transition-colors active:bg-muted active:text-foreground"
          >
            <Info className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </article>

      <BottomSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={title}
        subtitle={blurb}
        closeLabel={t("common.close")}
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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-surface/90 px-2.5 py-1 font-display text-[11px] font-bold text-foreground shadow-fantasy-sm">
      {children}
    </span>
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
      <p className="text-center font-display text-sm font-bold leading-snug text-foreground">
        {t(`play.info.${modeId}.rules`)}
      </p>

      {isSurvival && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-2" dir="ltr">
            {Array.from({ length: lives }, (_, i) => (
              <span
                key={i}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-xl shadow-fantasy-sm ring-1 ring-destructive/25"
                aria-hidden
              >
                ❤️
              </span>
            ))}
          </div>
          <p className="mt-2 font-display text-xs font-extrabold text-destructive">
            {t("play.info.survival.missHeart")}
          </p>
          {survivalBest != null && survivalBest > 0 && (
            <p className="mt-1 font-display text-[11px] font-bold text-muted-foreground">
              🏆 {t("play.info.survival.yourBest")}: {n(survivalBest)}
            </p>
          )}
        </div>
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
            <span className="text-xl" aria-hidden>
              {isSurvival ? "❤️" : modeId === "duel" ? "⚔️" : "🎯"}
            </span>
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
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center font-body text-[11px] font-semibold leading-snug text-muted-foreground">
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
        <p className="inline-flex w-full items-center justify-center gap-1 font-display text-[11px] font-bold text-muted-foreground">
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
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-muted/35 px-2 py-3 text-center shadow-fantasy-sm">
      <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex h-7 items-center justify-center">{icon}</span>
      <span className="font-display text-base font-black tabular-nums leading-none text-foreground">
        {value}
      </span>
      {sub ? (
        <span className="font-display text-[10px] font-bold text-muted-foreground">
          {sub}
        </span>
      ) : null}
    </div>
  );
}
