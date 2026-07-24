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
  { border: string; iconBg: string; cta: string; icon: string }
> = {
  penalty: {
    border: "border-secondary/30",
    iconBg: "bg-secondary/15 text-secondary",
    cta: "btn-fantasy-secondary",
    icon: "🧤",
  },
  quick: {
    border: "border-primary/30",
    iconBg: "bg-primary/15 text-primary",
    cta: "btn-fantasy-primary",
    icon: "⚡",
  },
  survival: {
    border: "border-destructive/25",
    iconBg: "bg-destructive/10 text-destructive",
    cta: "btn-fantasy-secondary",
    icon: "❤️",
  },
  duel: {
    border: "border-accent/35",
    iconBg: "bg-accent/20 text-accent-deep",
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
  survivalBest?: number | null;
  tone: MatchCardTone;
  /** Featured = larger hierarchy; compact = denser list row. */
  variant?: "featured" | "compact";
  /** Optional badge above title (e.g. Today's pick). */
  badge?: string | null;
};

export function MatchCard({
  modeId,
  href,
  title,
  blurb,
  ctaLabel,
  economy,
  survivalBest = null,
  tone,
  variant = "compact",
  badge = null,
}: MatchCardProps) {
  const { t, locale } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);
  const style = TONE[tone];
  const featured = variant === "featured";

  function openInfo(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    haptic(HAPTIC.light);
    playSound("click");
    setInfoOpen(true);
  }

  return (
    <>
      <article
        className={[
          "relative rounded-bubble-xl border bg-surface",
          style.border,
          featured
            ? "p-4 shadow-fantasy"
            : "p-3 shadow-fantasy-sm",
        ].join(" ")}
      >
        <button
          type="button"
          aria-label={t("play.modeInfo")}
          onClick={openInfo}
          className="absolute end-1 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>

        <button
          type="button"
          onClick={() => openInfo()}
          className="w-full pe-8 text-start"
        >
          {badge && (
            <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
              {badge}
            </p>
          )}
          <div className="flex items-start gap-2.5">
            <span
              className={[
                "flex shrink-0 items-center justify-center rounded-bubble text-xl",
                style.iconBg,
                featured ? "h-11 w-11" : "h-9 w-9 text-lg",
              ].join(" ")}
              aria-hidden
            >
              {style.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h3
                className={[
                  "font-display font-bold text-foreground",
                  featured ? "text-lg" : "text-base",
                ].join(" ")}
              >
                {title}
              </h3>
              <p className="mt-0.5 font-body text-xs font-semibold leading-snug text-muted-foreground">
                {blurb}
              </p>
            </div>
          </div>
        </button>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-xs font-bold text-foreground">
          <span>
            ⚡ {toLocaleDigits(economy.staminaCost, locale)}{" "}
            <span className="font-semibold text-muted-foreground">
              {t("play.metaEnergy")}
            </span>
          </span>
          <span className="text-border" aria-hidden>
            |
          </span>
          {modeId === "survival" ? (
            <span>
              {t("play.chipRecord", {
                n: toLocaleDigits(survivalBest ?? 0, locale),
              })}
            </span>
          ) : (
            <span>
              {t("play.chipWin", {
                coins: toLocaleDigits(economy.approxCoins, locale),
                xp: toLocaleDigits(economy.approxXp, locale),
              })}
            </span>
          )}
        </div>

        <Link
          href={href}
          onClick={() => {
            playSound("click");
            haptic(HAPTIC.tap);
          }}
          className={[
            "btn-fantasy mt-3 w-full !min-h-12 !py-2.5 text-sm",
            style.cta,
          ].join(" ")}
        >
          {ctaLabel}
        </Link>
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
              value={t("play.infoPerCorrectValue", {
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
              value={t("play.chipWin", {
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
