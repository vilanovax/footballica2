"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Play } from "lucide-react";
import { useState } from "react";
import type { CampaignSeasonView } from "@/lib/game/campaignSeason";
import { campaignSeasonActive } from "@/lib/game/campaignSeason";
import type { ActiveNewsBoosterSnapshot } from "@/lib/club/upgrades";
import { ActiveNewsChip } from "@/components/club-hub/ActiveNewsChip";
import { CampaignSeasonCard } from "@/components/club-hub/CampaignSeasonCard";
import { GamePanel } from "@/components/ui/game";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { cn } from "@/lib/utils";

type HubTodayRailProps = {
  mysteryStreak: number;
  campaignSeason: CampaignSeasonView | null;
  activeNews: ActiveNewsBoosterSnapshot | null;
  onOpenCampaign: () => void;
  onOpenNews: () => void;
  onNewsExpired: () => void;
};

/**
 * Secondary hub activities — tucked under the stadium so the first viewport
 * stays HUD + stadium world (progressive disclosure).
 */
export function HubTodayRail({
  mysteryStreak,
  campaignSeason,
  activeNews,
  onOpenCampaign,
  onOpenNews,
  onNewsExpired,
}: HubTodayRailProps) {
  const { t, locale } = useTranslation();
  const seasonOn = campaignSeason
    ? campaignSeasonActive(campaignSeason)
    : false;
  const rewardReady = Boolean(
    campaignSeason &&
      (campaignSeason.chestReady || campaignSeason.claimableCount > 0),
  );
  const hasCampaignBody = Boolean(
    campaignSeason &&
      (campaignSeason.chapters.length > 0 || rewardReady),
  );
  // Auto-open when there's something to show under the chip (chapters / claim).
  const [campaignOpen, setCampaignOpen] = useState(hasCampaignBody && rewardReady);
  const missionPct =
    campaignSeason && campaignSeason.missionsTotal > 0
      ? Math.round(
          (campaignSeason.missionsDone / campaignSeason.missionsTotal) * 100,
        )
      : 0;
  const hotMystery = mysteryStreak > 0;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <p className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          {t("club.today")}
        </p>
      </div>

      {/* Compact dual rail — Arena chrome */}
      <div className="grid grid-cols-2 gap-2">
        <motion.div whileTap={{ scale: 0.98 }}>
          <Link href="/play/mystery" onClick={() => playSound("click")}>
            <GamePanel
              tone={hotMystery ? "amber" : "emerald"}
              className="flex min-h-12 w-full items-center gap-2 px-2.5 py-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/mystery.png"
                alt=""
                draggable={false}
                className="relative h-8 w-8 shrink-0 object-contain"
              />
              <span className="relative min-w-0 flex-1 text-start">
                <span className="block truncate font-display text-xs font-black text-white">
                  {t("play.mysteryTitle")}
                </span>
                <span className="block truncate font-display text-[10px] font-bold text-white/60">
                  {hotMystery
                    ? t("mystery.streak", {
                        n: toLocaleDigits(mysteryStreak, locale),
                      })
                    : t("club.mysteryChipIdle")}
                </span>
              </span>
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                <Play className="ms-0.5 h-3.5 w-3.5 fill-current" aria-hidden />
              </span>
            </GamePanel>
          </Link>
        </motion.div>

        {seasonOn && campaignSeason ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.light);
              if (!hasCampaignBody) {
                onOpenCampaign();
                return;
              }
              setCampaignOpen((v) => !v);
            }}
            className="w-full text-start"
          >
            <GamePanel
              tone={rewardReady ? "amber" : "emerald"}
              className="flex min-h-12 w-full items-center gap-2 px-2.5 py-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/trophy.png"
                alt=""
                draggable={false}
                className="relative h-8 w-8 shrink-0 object-contain"
              />
              <span className="relative min-w-0 flex-1">
                <span className="block truncate font-display text-xs font-black text-white">
                  {t("campaign.title")}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                    <span
                      className="block h-full rounded-full bg-linear-to-r from-emerald-400 to-lime-300"
                      style={{ width: `${missionPct}%` }}
                    />
                  </span>
                  <span className="shrink-0 font-display text-[10px] font-black tabular-nums text-white/70">
                    {toLocaleDigits(campaignSeason.missionsDone, locale)}/
                    {toLocaleDigits(campaignSeason.missionsTotal, locale)}
                  </span>
                </span>
              </span>
              {hasCampaignBody ? (
                <ChevronDown
                  className={cn(
                    "relative h-4 w-4 shrink-0 text-white/55 transition-transform",
                    campaignOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              ) : (
                <Play
                  className="relative ms-0.5 h-3.5 w-3.5 shrink-0 fill-current text-accent"
                  aria-hidden
                />
              )}
            </GamePanel>
          </motion.button>
        ) : (
          <button
            type="button"
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.light);
              onOpenCampaign();
            }}
            className="w-full text-start"
          >
            <GamePanel
              tone="emerald"
              className="flex min-h-12 w-full items-center gap-2 px-2.5 py-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/hub-mission.png"
                alt=""
                draggable={false}
                className="relative h-8 w-8 shrink-0 object-contain"
              />
              <span className="relative min-w-0 flex-1 truncate font-display text-xs font-black text-white">
                {t("missions.tabPath")}
              </span>
            </GamePanel>
          </button>
        )}
      </div>

      {activeNews && (
        <ActiveNewsChip
          key={activeNews.expiresAt}
          booster={activeNews}
          onOpen={onOpenNews}
          onExpired={onNewsExpired}
          compact
        />
      )}

      {campaignOpen && seasonOn && campaignSeason && hasCampaignBody && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden"
        >
          <CampaignSeasonCard
            season={campaignSeason}
            onOpenMissions={onOpenCampaign}
            embedded
            chaptersOnly
          />
        </motion.div>
      )}
    </section>
  );
}
