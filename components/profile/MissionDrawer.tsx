"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MissionBoard } from "@/components/profile/MissionBoard";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type MissionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyBoard?: EvaluateMissionsResult | null;
  missionBoard?: EvaluateMissionsResult | null;
};

type TabKey = "daily" | "campaign";

/** True when a batch chest is waiting to be tapped. */
export function hasMissionRewardReady(
  daily?: EvaluateMissionsResult | null,
  campaign?: EvaluateMissionsResult | null,
): boolean {
  return Boolean(daily?.chestReady || campaign?.chestReady);
}

function boardStats(board?: EvaluateMissionsResult | null) {
  if (!board?.batchId || !board.missions.length) {
    return { done: 0, total: 0, ready: false };
  }
  const done = board.missions.filter((m) => m.isCompleted).length;
  return { done, total: board.missions.length, ready: board.chestReady };
}

/**
 * Bottom-sheet mission hub — tabbed, compact, focused on claim + play.
 */
export function MissionDrawer({
  open,
  onOpenChange,
  dailyBoard = null,
  missionBoard = null,
}: MissionDrawerProps) {
  const { t, locale } = useTranslation();
  const hasDaily = Boolean(dailyBoard?.batchId);
  const hasCampaign = Boolean(missionBoard?.batchId);

  const defaultTab: TabKey = useMemo(() => {
    if (dailyBoard?.chestReady) return "daily";
    if (missionBoard?.chestReady) return "campaign";
    if (hasDaily) return "daily";
    return "campaign";
  }, [dailyBoard?.chestReady, missionBoard?.chestReady, hasDaily]);

  const [tab, setTab] = useState<TabKey>(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dailyStats = boardStats(dailyBoard);
  const campaignStats = boardStats(missionBoard);
  const activeStats = tab === "daily" ? dailyStats : campaignStats;
  const rewardReady = hasMissionRewardReady(dailyBoard, missionBoard);
  const showTabs = hasDaily && hasCampaign;

  function close() {
    haptic(HAPTIC.light);
    onOpenChange(false);
  }

  function selectTab(next: TabKey) {
    if (next === tab) return;
    haptic(HAPTIC.light);
    setTab(next);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-60 mx-auto flex max-w-mobile flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={close}
            className="absolute inset-0 bg-background/65 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("missions.drawerTitle")}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="relative z-10 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-x-2 border-t-2 border-border bg-background shadow-fantasy-lg"
          >
            {/* Ambient header wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
              style={{
                background:
                  "linear-gradient(180deg, hsl(var(--secondary) / 0.12), transparent)",
              }}
            />

            <header className="relative shrink-0 px-4 pb-2 pt-3">
              <div className="mb-2 flex justify-center">
                <span
                  aria-hidden
                  className="h-1.5 w-11 rounded-full bg-muted-foreground/35"
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden>
                      🎯
                    </span>
                    <h2 className="font-display text-xl font-black text-foreground">
                      {t("missions.drawerTitle")}
                    </h2>
                  </div>
                  <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
                    {rewardReady
                      ? t("missions.drawerSubtitleReady")
                      : t("missions.drawerSubtitle", {
                          done: toLocaleDigits(
                            dailyStats.done + campaignStats.done,
                            locale,
                          ),
                          total: toLocaleDigits(
                            dailyStats.total + campaignStats.total,
                            locale,
                          ),
                        })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/90 font-display text-base font-bold text-muted-foreground transition-transform active:scale-95"
                  aria-label={t("common.close")}
                >
                  ✕
                </button>
              </div>

              {showTabs && (
                <div
                  role="tablist"
                  aria-label={t("missions.drawerTitle")}
                  className="relative mt-3 grid grid-cols-2 gap-1 rounded-bubble-lg bg-muted/60 p-1"
                >
                  {(
                    [
                      {
                        key: "daily" as const,
                        label: t("missions.dailyEyebrow"),
                        stats: dailyStats,
                      },
                      {
                        key: "campaign" as const,
                        label: t("missions.eyebrow"),
                        stats: campaignStats,
                      },
                    ] as const
                  ).map((item) => {
                    const active = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => selectTab(item.key)}
                        className={[
                          "relative z-10 flex min-h-10 items-center justify-center gap-1.5 rounded-bubble px-2 font-display text-sm font-bold transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {active && (
                          <motion.span
                            layoutId="mission-tab-pill"
                            className="absolute inset-0 rounded-bubble bg-surface shadow-fantasy-sm"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 32,
                            }}
                          />
                        )}
                        <span className="relative z-10">{item.label}</span>
                        <span
                          className={[
                            "relative z-10 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                            item.stats.ready
                              ? "bg-accent/25 text-accent-deep"
                              : "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          {toLocaleDigits(item.stats.done, locale)}/
                          {toLocaleDigits(item.stats.total, locale)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </header>

            <div className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-3 pt-1">
              {!hasDaily && !hasCampaign && (
                <p className="rounded-bubble-lg border border-border bg-surface px-4 py-8 text-center font-display text-sm font-semibold text-muted-foreground">
                  {t("missions.drawerEmpty")}
                </p>
              )}

              <AnimatePresence mode="wait">
                {tab === "daily" && hasDaily && dailyBoard && (
                  <motion.div
                    key="daily"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MissionBoard
                      initialBoard={dailyBoard}
                      variant="daily"
                      density="compact"
                    />
                  </motion.div>
                )}
                {tab === "campaign" && hasCampaign && missionBoard && (
                  <motion.div
                    key="campaign"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MissionBoard
                      initialBoard={missionBoard}
                      variant="campaign"
                      density="compact"
                    />
                  </motion.div>
                )}
                {!showTabs && hasDaily && !hasCampaign && dailyBoard && (
                  <MissionBoard
                    initialBoard={dailyBoard}
                    variant="daily"
                    density="compact"
                  />
                )}
                {!showTabs && hasCampaign && !hasDaily && missionBoard && (
                  <MissionBoard
                    initialBoard={missionBoard}
                    variant="campaign"
                    density="compact"
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Sticky play CTA — only when the active board isn't fully done */}
            {activeStats.total > 0 && activeStats.done < activeStats.total && (
              <div className="relative shrink-0 border-t border-border/70 bg-background/95 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
                <Link
                  href="/play"
                  onClick={close}
                  className="btn-fantasy btn-fantasy-pitch flex min-h-12 w-full items-center justify-center gap-2 font-display text-base font-bold"
                >
                  <span aria-hidden>⚽</span>
                  {t("missions.drawerPlayCta")}
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
