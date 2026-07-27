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
  if (modeId === "survival") {
    return (
      <SurvivalInfoBody economy={economy} survivalBest={survivalBest} />
    );
  }

  return (
    <StandardModeInfoBody modeId={modeId} economy={economy} />
  );
}

function StandardModeInfoBody({
  modeId,
  economy,
}: {
  modeId: Exclude<PlayModeId, "survival">;
  economy: PlayModeEconomy;
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
      </ul>
      <p className="text-xs">{t(`play.info.${modeId}.tip`)}</p>
      <p className="text-xs text-muted-foreground/80">{t("play.rewardHint")}</p>
    </div>
  );
}

function SurvivalInfoBody({
  economy,
  survivalBest,
}: {
  economy: PlayModeEconomy;
  survivalBest?: number | null;
}) {
  const { t, locale } = useTranslation();
  const n = (v: number) => toLocaleDigits(v, locale);
  const lives = economy.lives ?? 3;
  const best = survivalBest ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Hook line */}
      <p className="text-center font-body text-sm font-bold leading-snug text-foreground">
        {t("play.info.survival.rules")}
      </p>

      {/* Lives arena */}
      <div className="relative overflow-hidden rounded-3xl border border-destructive/25 bg-linear-to-b from-destructive/15 via-destructive/5 to-surface px-4 py-5 text-center shadow-fantasy-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-8 top-0 h-24 w-24 rounded-full bg-destructive/10 blur-2xl"
        />
        <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-wide text-destructive/80">
          {t("play.info.survival.howToPlay")}
        </p>
        <div className="flex items-center justify-center gap-2.5" dir="ltr">
          {Array.from({ length: lives }, (_, i) => (
            <span
              key={i}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-2xl shadow-fantasy-sm ring-2 ring-destructive/20"
              aria-hidden
            >
              ❤️
            </span>
          ))}
        </div>
        <p className="mt-3 font-display text-sm font-extrabold text-destructive">
          {t("play.info.survival.missHeart")}
        </p>
        <p className="mt-1 font-body text-xs font-semibold text-muted-foreground">
          {t("play.info.survival.tip")}
        </p>
      </div>

      {/* Entry + record */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-muted/30 px-3 py-3">
          <span className="font-body text-[11px] font-bold text-muted-foreground">
            {t("play.info.survival.entryCost")}
          </span>
          <span className="font-display text-xl font-extrabold text-foreground">
            ⚡ {n(economy.staminaCost)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-accent/30 bg-accent/10 px-3 py-3">
          <span className="font-body text-[11px] font-bold text-muted-foreground">
            {t("play.info.survival.yourBest")}
          </span>
          <span className="font-display text-xl font-extrabold text-foreground">
            🏆 {n(best)}
          </span>
        </div>
      </div>

      {/* Loot tiles */}
      <div className="grid grid-cols-2 gap-2">
        <LootTile
          emoji="✅"
          label={t("play.info.survival.lootCorrect")}
          value={`${n(economy.perCorrectCoins ?? 0)} 💰`}
          sub={`${n(economy.perCorrectXp ?? 0)} XP`}
        />
        <LootTile
          emoji="🏦"
          label={t("play.info.survival.lootClear")}
          value={`${n(economy.clearedCoinBonus ?? 0)} 💰`}
          sub={`${n(economy.clearedXpBonus ?? 0)} XP`}
          highlight
        />
      </div>
    </div>
  );
}

function LootTile({
  emoji,
  label,
  value,
  sub,
  highlight,
}: {
  emoji: string;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-1 rounded-2xl border px-3 py-3.5 text-center shadow-fantasy-sm",
        highlight
          ? "border-secondary/35 bg-secondary/12"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <span className="text-xl" aria-hidden>
        {emoji}
      </span>
      <span className="font-body text-[11px] font-bold text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-base font-extrabold text-foreground">
        {value}
      </span>
      <span className="font-display text-xs font-bold text-muted-foreground">
        {sub}
      </span>
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
