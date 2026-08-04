"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Play } from "lucide-react";
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
 * Hub Campaign pillar — dark game panel matching Club Business chrome.
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
      className={[
        "relative overflow-hidden rounded-bubble-xl border-[3px] shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
        rewardReady ? "border-amber-300/55" : "border-orange-400/40",
      ].join(" ")}
    >
      <div
        className="absolute inset-0 bg-linear-to-br from-[#431407] via-[#7c2d12] to-[#1c0a05]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
        }}
        aria-hidden
      />
      {rewardReady && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -end-10 top-0 h-28 w-28 rounded-full bg-amber-300/35 blur-2xl"
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      )}

      <button
        type="button"
        onClick={() => {
          playSound("click");
          haptic(HAPTIC.light);
          onOpenMissions();
        }}
        className="relative flex w-full flex-col gap-3 p-3 text-start transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/25 bg-black/30 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/stadium.png"
              alt=""
              draggable={false}
              className="h-10 w-10 object-contain"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-black uppercase tracking-widest text-orange-200/80">
              {t("campaign.eyebrow")}
            </p>
            <h2 className="font-display text-base font-black leading-tight text-white drop-shadow-sm">
              {t("campaign.title")}
            </h2>
            <p className="mt-0.5 truncate font-display text-[11px] font-bold text-white/65">
              {batchLabel}
              {rewardReady ? (
                <span className="ms-1.5 text-amber-200">
                  · {t("campaign.rewardsReady")}
                </span>
              ) : null}
            </p>
          </div>
          <span
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
              rewardReady
                ? "border-amber-300/60 bg-accent"
                : "border-white/20 bg-black/30",
            ].join(" ")}
            aria-label={t("campaign.openPath")}
            title={t("campaign.openPath")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/hub-mission.png"
              alt=""
              draggable={false}
              className="h-8 w-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
            />
          </span>
        </div>

        {season.missionsTotal > 0 && (
          <div className="rounded-xl border border-white/15 bg-black/25 px-2.5 py-2">
            <div className="mb-1.5 flex items-center justify-between font-display text-[10px] font-black">
              <span className="text-white/60">
                {t("campaign.missionsProgress")}
              </span>
              <span className="tabular-nums text-white">
                {toLocaleDigits(season.missionsDone, locale)}/
                {toLocaleDigits(season.missionsTotal, locale)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/15">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-orange-400 to-amber-300"
                initial={false}
                animate={{ width: `${missionPct}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
              />
            </div>
          </div>
        )}
      </button>

      {season.chapters.length > 0 && (
        <div className="relative border-t border-white/12 px-3 pb-3 pt-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-[10px] font-black uppercase tracking-wide text-white/55">
              {t("campaign.chapters")}
            </p>
            <p className="font-display text-[11px] font-black tabular-nums text-white/70">
              {toLocaleDigits(season.chaptersConquered, locale)}/
              {toLocaleDigits(season.chapters.length, locale)}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {season.chapters.slice(0, 3).map((ch, i) => {
              const title = locale === "fa" ? ch.titleFa : ch.titleEn;
              const statusLabel = ch.conquered
                ? t("campaign.chapterDone")
                : ch.unlocked
                  ? t("campaign.chapterPlay")
                  : t("campaign.chapterLocked");
              return (
                <li key={ch.id}>
                  <Link
                    href={`/play/survival?challenge=${encodeURIComponent(ch.id)}`}
                    onClick={() => playSound("click")}
                    aria-label={`${title} — ${statusLabel}`}
                    className={[
                      "flex min-h-11 items-center gap-2.5 rounded-2xl border-2 px-2.5 py-2 shadow-[0_3px_0_0_rgba(0,0,0,0.25)] transition-transform active:translate-y-px active:shadow-none",
                      ch.conquered
                        ? "border-emerald-400/40 bg-emerald-950/50"
                        : ch.unlocked
                          ? "border-white/20 bg-black/35"
                          : "border-white/10 bg-black/20 opacity-70",
                    ].join(" ")}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/40 font-display text-sm font-black text-white/80 ring-1 ring-white/15"
                      aria-hidden
                    >
                      {ch.conquered
                        ? ch.rewardBadgeEmoji || "🏆"
                        : toLocaleDigits(i + 1, locale)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-display text-sm font-black text-white">
                      {title}
                    </span>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center"
                      aria-hidden
                      title={statusLabel}
                    >
                      {ch.conquered ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/icons/done.png"
                          alt=""
                          draggable={false}
                          className="h-8 w-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                        />
                      ) : ch.unlocked ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
                          <Play className="ms-0.5 h-4 w-4 fill-current" />
                        </span>
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/50 ring-1 ring-white/15">
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {season.chapters.length > 3 && (
            <Link
              href="/play/survival"
              className="mt-2 block text-center font-display text-xs font-black text-amber-200/90"
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
