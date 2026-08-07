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
    shell: string;
    iconShell: string;
    cta: string;
    iconSrc: string;
    wash: string;
  }
> = {
  penalty: {
    shell:
      "bg-linear-to-br from-[#052e16] via-[#0f172a] to-[#022c22] shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_4px_0_0_rgba(0,0,0,0.3)]",
    iconShell:
      "border-emerald-400/40 bg-emerald-600/35 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
    cta: "border-emerald-400/45 bg-linear-to-b from-emerald-500 to-emerald-800 text-white shadow-[0_4px_0_0_rgba(0,0,0,0.4)]",
    iconSrc: "/icons/target.png",
    wash: "bg-emerald-400/20",
  },
  quick: {
    shell:
      "bg-linear-to-br from-[#052e16] via-[#14532d] to-[#0f172a] shadow-[0_0_0_1px_rgba(74,222,128,0.4),0_4px_0_0_rgba(0,0,0,0.3)]",
    iconShell:
      "border-lime-300/45 bg-lime-500/30 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
    cta: "border-lime-300/50 bg-linear-to-b from-lime-400 to-emerald-700 text-emerald-950 shadow-[0_4px_0_0_rgba(0,0,0,0.4)]",
    iconSrc: "/icons/energy.png",
    wash: "bg-lime-300/20",
  },
  survival: {
    shell:
      "bg-linear-to-br from-[#431407] via-[#0f172a] to-[#1c0a05] shadow-[0_0_0_1px_rgba(248,113,113,0.4),0_4px_0_0_rgba(0,0,0,0.3)]",
    iconShell:
      "border-rose-300/40 bg-rose-600/35 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
    cta: "border-rose-300/45 bg-linear-to-b from-rose-500 to-rose-800 text-white shadow-[0_4px_0_0_rgba(0,0,0,0.4)]",
    iconSrc: "/icons/heart.png",
    wash: "bg-rose-400/20",
  },
  duel: {
    shell:
      "bg-linear-to-br from-[#5c3d0a] via-[#0f172a] to-[#2a1c06] shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_4px_0_0_rgba(0,0,0,0.3)]",
    iconShell:
      "border-amber-300/45 bg-amber-500/30 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
    cta: "border-amber-300/50 bg-linear-to-b from-accent to-[hsl(38_92%_42%)] text-accent-foreground shadow-[0_4px_0_0_rgba(120,70,0,0.5)]",
    iconSrc: "/icons/trophy.png",
    wash: "bg-amber-300/20",
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
 * Dark game Match Card — mode-tinted chrome, chip meta, CTA + info sheet.
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
      <article
        className={[
          "relative overflow-hidden rounded-bubble-xl p-3.5",
          style.shell,
          urgent
            ? "shadow-[0_0_0_2px_rgba(251,191,36,0.65),0_0_22px_rgba(251,191,36,0.28),0_4px_0_0_rgba(0,0,0,0.3)]"
            : "",
        ].join(" ")}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
          aria-hidden
        />
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute -end-10 -top-8 h-28 w-28 rounded-full blur-3xl",
            style.wash,
          ].join(" ")}
        />

        <div className="relative flex items-start gap-3">
          <span
            className={[
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2",
              style.iconShell,
            ].join(" ")}
            aria-hidden
          >
            <GameIcon src={style.iconSrc} className="h-7 w-7" />
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
                <span className="rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-wide text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.3)]">
                  {urgentBadge}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 font-display text-xs font-bold text-white/55">
              {blurb}
            </p>
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap gap-1.5">
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
                  <GameIcon
                    src="/icons/crown.png"
                    className="me-1 h-3.5 w-3.5"
                  />
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

        <div className="relative mt-3 flex items-center gap-2">
          <Link
            href={href}
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.tap);
            }}
            className={[
              "flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 px-3 font-display text-sm font-black transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.4)]",
              style.cta,
            ].join(" ")}
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            aria-label={t("play.modeInfo")}
            onClick={openInfo}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/35 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_3px_0_0_rgba(0,0,0,0.3)] transition-transform active:scale-90"
          >
            <GameIcon src="/icons/help.png" className="h-8 w-8" />
          </button>
        </div>
      </article>

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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/40 px-2.5 py-1 font-display text-[11px] font-black text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
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
      <p className="text-center font-display text-sm font-bold leading-snug text-white/85">
        {t(`play.info.${modeId}.rules`)}
      </p>

      {isSurvival && (
        <div className="rounded-2xl bg-rose-500/15 px-3 py-3 text-center shadow-[inset_0_0_0_1px_rgba(251,113,133,0.35)]">
          <div className="flex items-center justify-center gap-2" dir="ltr">
            {Array.from({ length: lives }, (_, i) => (
              <span
                key={i}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                aria-hidden
              >
                <GameIcon src="/icons/heart.png" className="h-6 w-6" />
              </span>
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
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-black/40 px-2 py-3 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
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
    </div>
  );
}
