"use client";

import { useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { PlayModeEconomy, PlayModeId } from "@/lib/play/modeEconomy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

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
          <Chip>⚡ {toLocaleDigits(economy.staminaCost, locale)}</Chip>
          {modeId === "survival" ? (
            <>
              <Chip>
                {t("play.chipPerCorrect", {
                  coins: toLocaleDigits(economy.perCorrectCoins ?? 0, locale),
                  xp: toLocaleDigits(economy.perCorrectXp ?? 0, locale),
                })}
              </Chip>
              <Chip>
                {t("play.chipRecord", {
                  n: toLocaleDigits(survivalBest ?? 0, locale),
                })}
              </Chip>
            </>
          ) : (
            <Chip>
              {t("play.chipReward", {
                coins: toLocaleDigits(economy.approxCoins, locale),
                xp: toLocaleDigits(economy.approxXp, locale),
              })}
            </Chip>
          )}
          {modeId === "duel" && economy.duelWinWeeklyXp != null && (
            <Chip>
              {t("play.chipWeeklyXp", {
                n: toLocaleDigits(economy.duelWinWeeklyXp, locale),
              })}
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-surface/90 px-2.5 py-1 font-display text-[11px] font-bold text-foreground shadow-fantasy-sm">
      {children}
    </span>
  );
}

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

  return (
    <div className="flex flex-col gap-3 font-body text-sm font-semibold leading-relaxed text-muted-foreground">
      <p>{t(`play.info.${modeId}.rules`)}</p>
      <ul className="flex flex-col gap-2">
        <InfoRow
          label={t("play.info.stamina")}
          value={`⚡ ${n(economy.staminaCost)}`}
        />
        {modeId === "survival" ? (
          <>
            <InfoRow
              label={t("play.info.perCorrect")}
              value={t("play.chipPerCorrect", {
                coins: n(economy.perCorrectCoins ?? 0),
                xp: n(economy.perCorrectXp ?? 0),
              })}
            />
            <InfoRow
              label={t("play.info.lives")}
              value={n(economy.lives ?? 3)}
            />
            <InfoRow
              label={t("play.info.bestScore")}
              value={n(survivalBest ?? 0)}
            />
            <InfoRow
              label={t("play.info.clearedBonus")}
              value={`${n(economy.clearedCoinBonus ?? 0)} 💰 · ${n(economy.clearedXpBonus ?? 0)} XP`}
            />
          </>
        ) : (
          <>
            {economy.questionCount != null && (
              <InfoRow
                label={t("play.info.questions")}
                value={n(economy.questionCount)}
              />
            )}
            <InfoRow
              label={t("play.info.approxWin")}
              value={t("play.chipReward", {
                coins: n(economy.approxCoins),
                xp: n(economy.approxXp),
              })}
            />
            {modeId === "duel" && economy.duelWinWeeklyXp != null && (
              <InfoRow
                label={t("play.info.weeklyXp")}
                value={n(economy.duelWinWeeklyXp)}
              />
            )}
          </>
        )}
      </ul>
      <p className="text-xs">{t(`play.info.${modeId}.tip`)}</p>
      {modeId !== "survival" && (
        <p className="text-xs text-muted-foreground/80">
          {t("play.rewardHint")}
        </p>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-bubble border border-border bg-muted/40 px-3 py-2">
      <span>{label}</span>
      <span className="font-display font-bold text-foreground">{value}</span>
    </li>
  );
}
