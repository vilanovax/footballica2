"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  MissionBoard,
  playHrefForObjective,
} from "@/components/profile/MissionBoard";
import {
  claimMyMissionChest,
  claimMyMissionReward,
  getMyMissions,
} from "@/actions/missions";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type MissionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyBoard?: EvaluateMissionsResult | null;
  missionBoard?: EvaluateMissionsResult | null;
  onEconomyUpdate?: (balances: { coins: number; xp: number }) => void;
};

type TabKey = "daily" | "campaign";

function hasUnclaimedDrip(board?: EvaluateMissionsResult | null): boolean {
  return Boolean(
    board?.missions.some((m) => m.isCompleted && !m.isClaimed),
  );
}

export function hasMissionRewardReady(
  daily?: EvaluateMissionsResult | null,
  campaign?: EvaluateMissionsResult | null,
): boolean {
  return countMissionRewardsReady(daily, campaign) > 0;
}

export function countMissionRewardsReady(
  daily?: EvaluateMissionsResult | null,
  campaign?: EvaluateMissionsResult | null,
): number {
  let n = 0;
  for (const board of [daily, campaign]) {
    if (!board) continue;
    if (board.chestReady) n += 1;
    n += board.missions.filter((m) => m.isCompleted && !m.isClaimed).length;
  }
  return n;
}

function boardStats(board?: EvaluateMissionsResult | null) {
  if (!board?.batchId || !board.missions.length) {
    return { done: 0, total: 0, ready: false, claimableCount: 0 };
  }
  const done = board.missions.filter((m) => m.isCompleted).length;
  const claimableCount = board.missions.filter(
    (m) => m.isCompleted && !m.isClaimed,
  ).length;
  return {
    done,
    total: board.missions.length,
    ready: Boolean(board.chestReady || claimableCount > 0),
    claimableCount,
  };
}

function firstIncompleteHref(
  board?: EvaluateMissionsResult | null,
): string | null {
  const m = board?.missions.find((x) => !x.isCompleted);
  if (!m) return null;
  return playHrefForObjective(m.objectiveType);
}

/**
 * Bottom-sheet mission hub — claim-first footer, Daily / Path tabs.
 */
export function MissionDrawer({
  open,
  onOpenChange,
  dailyBoard = null,
  missionBoard = null,
  onEconomyUpdate,
}: MissionDrawerProps) {
  const { t, locale } = useTranslation();
  const [liveDaily, setLiveDaily] = useState(dailyBoard);
  const [liveCampaign, setLiveCampaign] = useState(missionBoard);
  const [, startRefresh] = useTransition();
  const [claimingAll, setClaimingAll] = useState(false);

  useEffect(() => {
    setLiveDaily(dailyBoard);
  }, [dailyBoard]);

  useEffect(() => {
    setLiveCampaign(missionBoard);
  }, [missionBoard]);

  useEffect(() => {
    if (!open) return;
    startRefresh(async () => {
      const res = await getMyMissions();
      if (!res.ok) return;
      setLiveDaily(res.daily);
      setLiveCampaign(res.board);
    });
  }, [open]);

  const hasDaily = Boolean(liveDaily?.batchId);
  const hasCampaign = Boolean(liveCampaign?.batchId);

  const defaultTab: TabKey = useMemo(() => {
    if (liveDaily?.chestReady || hasUnclaimedDrip(liveDaily)) return "daily";
    if (liveCampaign?.chestReady || hasUnclaimedDrip(liveCampaign)) {
      return "campaign";
    }
    if (hasDaily) return "daily";
    return "campaign";
  }, [liveDaily, liveCampaign, hasDaily]);

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

  const dailyStats = boardStats(liveDaily);
  const campaignStats = boardStats(liveCampaign);
  const activeBoard = tab === "daily" ? liveDaily : liveCampaign;
  const activeStats = tab === "daily" ? dailyStats : campaignStats;
  const anyRewardReady = hasMissionRewardReady(liveDaily, liveCampaign);
  const showTabs = hasDaily && hasCampaign;
  const continueHref = firstIncompleteHref(activeBoard);

  const claimableTotal =
    activeStats.claimableCount + (activeBoard?.chestReady ? 1 : 0);

  function close() {
    haptic(HAPTIC.light);
    onOpenChange(false);
  }

  function selectTab(next: TabKey) {
    if (next === tab) return;
    haptic(HAPTIC.light);
    setTab(next);
  }

  async function refreshBoards() {
    const res = await getMyMissions();
    if (!res.ok) return null;
    setLiveDaily(res.daily);
    setLiveCampaign(res.board);
    return res;
  }

  async function handleClaimAll() {
    if (!activeBoard?.batchId || claimingAll) return;
    setClaimingAll(true);
    playSound("click");
    haptic(HAPTIC.tap);

    try {
      let lastBalances: { coins: number; xp: number } | null = null;
      const drips = activeBoard.missions.filter(
        (m) => m.isCompleted && !m.isClaimed,
      );

      for (const m of drips) {
        const res = await claimMyMissionReward(m.missionId);
        if (!res.ok) {
          toast.error(t("missions.errClaimDrip"));
          break;
        }
        lastBalances = res.balances;
      }

      const afterDrips = await refreshBoards();
      const boardAfter =
        tab === "daily" ? afterDrips?.daily : afterDrips?.board;

      if (boardAfter?.chestReady && boardAfter.batchId) {
        const chest = await claimMyMissionChest(boardAfter.batchId);
        if (!chest.ok) {
          toast.error(t("missions.errClaim"));
        } else {
          lastBalances = chest.balances;
          playSound("upgrade");
          haptic(HAPTIC.goal);
        }
        await refreshBoards();
      } else if (lastBalances) {
        playSound("upgrade");
        haptic(HAPTIC.goal);
      }

      if (lastBalances) {
        onEconomyUpdate?.(lastBalances);
      }
    } finally {
      setClaimingAll(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] mx-auto flex max-w-mobile flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={close}
            className="absolute inset-0 bg-[hsl(210_45%_8%/0.62)] backdrop-blur-[6px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("missions.drawerTitle")}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="relative z-10 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-x-2 border-t-2 border-foreground/12 bg-surface shadow-[0_-18px_48px_rgba(15,35,55,0.28)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-32"
              style={{
                background:
                  "linear-gradient(180deg, hsl(var(--secondary) / 0.22), hsl(var(--surface)) 70%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary via-primary to-accent"
            />

            <header className="relative shrink-0 px-4 pb-2 pt-3">
              <div className="mb-2 flex justify-center">
                <span
                  aria-hidden
                  className="h-1.5 w-11 rounded-full bg-foreground/20"
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
                    {anyRewardReady
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-muted font-display text-base font-bold text-muted-foreground transition-transform active:scale-95"
                  aria-label={t("common.close")}
                >
                  ✕
                </button>
              </div>

              {showTabs && (
                <div
                  role="tablist"
                  aria-label={t("missions.drawerTitle")}
                  className="relative mt-3 grid grid-cols-2 gap-1 rounded-bubble-lg border border-foreground/8 bg-muted p-1"
                >
                  {(
                    [
                      {
                        key: "daily" as const,
                        label: t("missions.tabDaily"),
                        stats: dailyStats,
                      },
                      {
                        key: "campaign" as const,
                        label: t("missions.tabPath"),
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
                            className="absolute inset-0 rounded-bubble border border-foreground/8 bg-surface shadow-fantasy-sm"
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
                              : "bg-background/80 text-muted-foreground",
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

            <div className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gradient-to-b from-surface to-[hsl(var(--muted)/0.55)] px-4 pb-3 pt-1">
              {!hasDaily && !hasCampaign && (
                <p className="rounded-bubble-lg border border-border bg-surface px-4 py-8 text-center font-display text-sm font-semibold text-muted-foreground shadow-fantasy-sm">
                  {t("missions.drawerEmpty")}
                </p>
              )}

              <AnimatePresence mode="wait">
                {tab === "daily" && hasDaily && liveDaily && (
                  <motion.div
                    key={`daily-${liveDaily.batchId}-${dailyStats.done}-${liveDaily.missions.map((m) => `${m.progress}-${m.isClaimed}`).join(".")}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MissionBoard
                      initialBoard={liveDaily}
                      variant="daily"
                      density="compact"
                      onDripClaimed={onEconomyUpdate}
                      onClaimed={() => {
                        startRefresh(async () => {
                          await refreshBoards();
                        });
                      }}
                    />
                  </motion.div>
                )}
                {tab === "campaign" && hasCampaign && liveCampaign && (
                  <motion.div
                    key={`campaign-${liveCampaign.batchId}-${campaignStats.done}-${liveCampaign.missions.map((m) => `${m.progress}-${m.isClaimed}`).join(".")}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MissionBoard
                      initialBoard={liveCampaign}
                      variant="campaign"
                      density="compact"
                      onDripClaimed={onEconomyUpdate}
                      onClaimed={() => {
                        startRefresh(async () => {
                          await refreshBoards();
                        });
                      }}
                    />
                  </motion.div>
                )}
                {!showTabs && hasDaily && !hasCampaign && liveDaily && (
                  <MissionBoard
                    key={`daily-solo-${liveDaily.batchId}-${dailyStats.done}`}
                    initialBoard={liveDaily}
                    variant="daily"
                    density="compact"
                    onDripClaimed={onEconomyUpdate}
                  />
                )}
                {!showTabs && hasCampaign && !hasDaily && liveCampaign && (
                  <MissionBoard
                    key={`campaign-solo-${liveCampaign.batchId}-${campaignStats.done}`}
                    initialBoard={liveCampaign}
                    variant="campaign"
                    density="compact"
                    onDripClaimed={onEconomyUpdate}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Dynamic footer: Claim All when ready, else deep-link continue. */}
            {activeStats.ready ? (
              <div className="relative shrink-0 border-t border-foreground/10 bg-surface px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,35,55,0.08)]">
                <motion.button
                  type="button"
                  disabled={claimingAll}
                  onClick={handleClaimAll}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.1,
                    ease: "easeInOut",
                  }}
                  className="btn-fantasy btn-fantasy-accent flex min-h-12 w-full items-center justify-center gap-2 font-display text-base font-bold disabled:opacity-60"
                >
                  <span aria-hidden>🎁</span>
                  {claimingAll
                    ? t("missions.claiming")
                    : claimableTotal > 1
                      ? t("missions.drawerClaimAll")
                      : t("missions.drawerClaimReward")}
                </motion.button>
              </div>
            ) : continueHref ? (
              <div className="relative shrink-0 border-t border-foreground/10 bg-surface px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,35,55,0.08)]">
                <Link
                  href={continueHref}
                  onClick={close}
                  className="btn-fantasy btn-fantasy-pitch flex min-h-12 w-full items-center justify-center gap-2 font-display text-base font-bold"
                >
                  <span aria-hidden>⚽</span>
                  {t("missions.drawerContinueCta")}
                </Link>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
