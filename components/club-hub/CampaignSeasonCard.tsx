"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Lock, Play } from "lucide-react";
import type { CampaignSeasonView } from "@/lib/game/campaignSeason";
import { campaignSeasonActive } from "@/lib/game/campaignSeason";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  season: CampaignSeasonView;
  onOpenMissions: () => void;
  /** Nested under Today rail — quieter club chrome, no entrance motion. */
  embedded?: boolean;
  /**
   * When nested under the Today rail chip: skip the duplicated title/progress
   * header and only show chapters (or a claim CTA).
   */
  chaptersOnly?: boolean;
};

/**
 * Hub Campaign pillar — quest-path panel with glanceable progress.
 */
export function CampaignSeasonCard({
  season,
  onOpenMissions,
  embedded = false,
  chaptersOnly = false,
}: Props) {
  const { t, locale } = useTranslation();

  if (!campaignSeasonActive(season)) return null;

  const missionPct =
    season.missionsTotal > 0
      ? Math.round((season.missionsDone / season.missionsTotal) * 100)
      : 0;
  const chapterPct =
    season.chapters.length > 0
      ? Math.round(
          (season.chaptersConquered / season.chapters.length) * 100,
        )
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
      initial={embedded || chaptersOnly ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className={[
        "relative overflow-hidden rounded-bubble-xl border-[3px] shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
        rewardReady
          ? "border-amber-300/55"
          : embedded || chaptersOnly
            ? "border-emerald-500/35"
            : "border-emerald-500/40",
      ].join(" ")}
    >
      <div
        className="absolute inset-0 bg-linear-to-br from-[#022c22] via-[#14532d] to-[#0f172a]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
        }}
        aria-hidden
      />
      {rewardReady && !chaptersOnly && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -end-10 top-0 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl"
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      )}

      {!chaptersOnly && (
        <button
          type="button"
          onClick={() => {
            playSound("click");
            haptic(HAPTIC.light);
            onOpenMissions();
          }}
          className={[
            "relative flex w-full flex-col text-start transition-transform active:scale-[0.99]",
            embedded ? "gap-2.5 p-3" : "gap-3 p-3.5",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <span
              className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/25 bg-black/35 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/trophy.png"
                alt=""
                draggable={false}
                className="h-8 w-8 object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/75">
                {t("campaign.eyebrow")}
              </p>
              <h2 className="font-display text-sm font-black leading-tight text-white drop-shadow-sm">
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
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
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
                className="h-7 w-7 object-contain"
              />
            </span>
          </div>

          {season.missionsTotal > 0 && (
            <div className="rounded-xl border border-white/12 bg-black/30 px-2.5 py-2">
              <div className="mb-1.5 flex items-center justify-between font-display text-[10px] font-black">
                <span className="text-white/60">
                  {t("campaign.missionsProgress")}
                </span>
                <span className="tabular-nums text-white">
                  {toLocaleDigits(season.missionsDone, locale)}/
                  {toLocaleDigits(season.missionsTotal, locale)}
                  <span className="ms-1.5 text-emerald-200/90">
                    {toLocaleDigits(missionPct, locale)}%
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/12">
                <motion.div
                  className="relative h-full rounded-full bg-linear-to-r from-emerald-400 to-lime-300"
                  initial={false}
                  animate={{ width: `${missionPct}%` }}
                  transition={{ type: "spring", stiffness: 220, damping: 28 }}
                />
              </div>
            </div>
          )}
        </button>
      )}

      {chaptersOnly && rewardReady && (
        <button
          type="button"
          onClick={() => {
            playSound("click");
            haptic(HAPTIC.light);
            onOpenMissions();
          }}
          className="relative flex w-full items-center gap-2.5 border-b border-white/12 px-3 py-2.5 text-start active:bg-white/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/gift.png"
              alt=""
              draggable={false}
              className="h-6 w-6 object-contain"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-black text-amber-100">
              {t("campaign.rewardsReady")}
            </span>
            <span className="block font-display text-[11px] font-bold text-white/60">
              {t("campaign.openPath")}
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-amber-200/80 rtl:rotate-180"
            aria-hidden
          />
        </button>
      )}

      {season.chapters.length > 0 && (
        <div
          className={[
            "relative px-3.5 pb-3.5 pt-3",
            chaptersOnly ? "" : "border-t border-white/12",
          ].join(" ")}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
              {t("campaign.chapters")}
            </p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/10">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-emerald-400 to-lime-300"
                  initial={false}
                  animate={{ width: `${chapterPct}%` }}
                />
              </div>
              <p className="font-display text-[11px] font-black tabular-nums text-white/75">
                {toLocaleDigits(season.chaptersConquered, locale)}/
                {toLocaleDigits(season.chapters.length, locale)}
              </p>
            </div>
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
                      "flex min-h-12 items-center gap-2.5 rounded-2xl border-2 px-2.5 py-2 shadow-[0_3px_0_0_rgba(0,0,0,0.28)] transition-transform active:translate-y-px active:shadow-none",
                      ch.conquered
                        ? "border-emerald-400/45 bg-emerald-950/55"
                        : ch.unlocked
                          ? "border-white/25 bg-black/40"
                          : "border-white/10 bg-black/25 opacity-70",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-black ring-1",
                        ch.conquered
                          ? "bg-emerald-500/20 text-emerald-100 ring-emerald-300/30"
                          : ch.unlocked
                            ? "bg-black/45 text-white ring-white/20"
                            : "bg-black/30 text-white/50 ring-white/10",
                      ].join(" ")}
                      aria-hidden
                    >
                      {ch.conquered
                        ? // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src="/icons/medal-gold.png"
                            alt=""
                            draggable={false}
                            className="h-6 w-6 object-contain"
                          />
                        : toLocaleDigits(i + 1, locale)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-display text-sm font-black text-white drop-shadow-sm">
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
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_3px_0_0_rgba(0,0,0,0.4)]">
                          <Play className="ms-0.5 h-4 w-4 fill-current" />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/50 ring-1 ring-white/15">
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
              className="mt-2.5 block text-center font-display text-xs font-black text-amber-200/95"
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
