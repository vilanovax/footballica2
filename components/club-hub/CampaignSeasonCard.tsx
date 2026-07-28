"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CampaignSeasonView } from "@/lib/game/campaignSeason";
import { campaignSeasonActive } from "@/lib/game/campaignSeason";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  season: CampaignSeasonView;
  onOpenMissions: () => void;
};

/**
 * Hub Campaign pillar (ADR 002) — metagame entry, not a Play mode card.
 * Opens Mission drawer (Campaign tab) + deep-links Survival chapters.
 */
export function CampaignSeasonCard({ season, onOpenMissions }: Props) {
  const { t, locale } = useTranslation();

  if (!campaignSeasonActive(season)) return null;

  const missionPct =
    season.missionsTotal > 0
      ? Math.round((season.missionsDone / season.missionsTotal) * 100)
      : 0;
  const rewardReady = season.chestReady || season.claimableCount > 0;
  const batchLabel =
    season.batchIndex != null
      ? t("campaign.batch", {
          n: toLocaleDigits(season.batchIndex, locale),
        })
      : t("campaign.seasonLive");

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-bubble-lg border border-secondary/35 bg-linear-to-br from-secondary/20 via-surface to-primary/10 shadow-fantasy-sm"
    >
      <button
        type="button"
        onClick={() => {
          playSound("click");
          haptic(HAPTIC.light);
          onOpenMissions();
        }}
        className="flex w-full flex-col gap-3 p-3.5 text-start transition-transform active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/25 text-2xl shadow-fantasy-sm ring-1 ring-secondary/30"
            aria-hidden
          >
            🏟️
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-bold uppercase tracking-widest text-secondary">
              {t("campaign.eyebrow")}
            </p>
            <h2 className="font-display text-lg font-black leading-tight text-foreground">
              {t("campaign.title")}
            </h2>
            <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
              {batchLabel}
              {rewardReady ? (
                <span className="ms-1.5 text-accent-deep">
                  · {t("campaign.rewardsReady")}
                </span>
              ) : null}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 font-display text-xs font-extrabold text-primary">
            {t("campaign.openPath")}
          </span>
        </div>

        {season.missionsTotal > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between font-display text-[11px] font-bold text-muted-foreground">
              <span>{t("campaign.missionsProgress")}</span>
              <span className="tabular-nums text-foreground">
                {toLocaleDigits(season.missionsDone, locale)}/
                {toLocaleDigits(season.missionsTotal, locale)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted ring-1 ring-border/60">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-secondary to-primary"
                initial={false}
                animate={{ width: `${missionPct}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
              />
            </div>
          </div>
        )}
      </button>

      {season.chapters.length > 0 && (
        <div className="border-t border-border/50 px-3.5 pb-3.5 pt-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("campaign.chapters")}
            </p>
            <p className="font-display text-[11px] font-bold tabular-nums text-muted-foreground">
              {toLocaleDigits(season.chaptersConquered, locale)}/
              {toLocaleDigits(season.chapters.length, locale)}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {season.chapters.slice(0, 3).map((ch, i) => {
              const title = locale === "fa" ? ch.titleFa : ch.titleEn;
              return (
                <li key={ch.id}>
                  <Link
                    href={`/play/survival?challenge=${encodeURIComponent(ch.id)}`}
                    onClick={() => playSound("click")}
                    className={[
                      "flex min-h-11 items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition-colors",
                      ch.conquered
                        ? "border-emerald-500/35 bg-emerald-500/10"
                        : "border-border/70 bg-surface/80 hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-black text-muted-foreground"
                      aria-hidden
                    >
                      {ch.conquered
                        ? ch.rewardBadgeEmoji || "🏆"
                        : toLocaleDigits(i + 1, locale)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-foreground">
                      {title}
                    </span>
                    <span className="shrink-0 font-display text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      {ch.conquered
                        ? t("campaign.chapterDone")
                        : ch.unlocked
                          ? t("campaign.chapterPlay")
                          : t("campaign.chapterLocked")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {season.chapters.length > 3 && (
            <Link
              href="/play/survival"
              className="mt-2 block text-center font-display text-xs font-bold text-primary"
            >
              {t("campaign.moreChapters", {
                n: toLocaleDigits(season.chapters.length - 3, locale),
              })}
            </Link>
          )}
        </div>
      )}
    </motion.section>
  );
}
