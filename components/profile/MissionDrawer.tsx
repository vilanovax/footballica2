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
import type { CampaignChapterView } from "@/lib/game/campaignSeason";
import {
  countMissionRewardsReady,
  hasMissionRewardReady,
} from "@/lib/game/missionRewards";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

export { countMissionRewardsReady, hasMissionRewardReady };

type TabKey = "daily" | "campaign";

type MissionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Force Daily / Campaign tab when opening from Hub Campaign card. */
  preferredTab?: TabKey;
  dailyBoard?: EvaluateMissionsResult | null;
  missionBoard?: EvaluateMissionsResult | null;
  /** Live RecordChallenge chapters (ADR 002 soft narrative). */
  chapters?: CampaignChapterView[];
  onEconomyUpdate?: (balances: { coins: number; xp: number }) => void;
};

function hasUnclaimedDrip(board?: EvaluateMissionsResult | null): boolean {
  return Boolean(
    board?.missions.some((m) => m.isCompleted && !m.isClaimed),
  );
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
 * Bottom-sheet mission hub — claim-first footer, Daily / Campaign tabs.
 * Dark emerald game chrome aligned with Club Hub sheets.
 */
export function MissionDrawer({
  open,
  onOpenChange,
  preferredTab,
  dailyBoard = null,
  missionBoard = null,
  chapters = [],
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
  const hasChapters = chapters.length > 0;
  const hasCampaignPane = hasCampaign || hasChapters;

  const defaultTab: TabKey = useMemo(() => {
    if (preferredTab === "campaign" && hasCampaignPane) return "campaign";
    if (preferredTab === "daily" && hasDaily) return "daily";
    if (liveDaily?.chestReady || hasUnclaimedDrip(liveDaily)) return "daily";
    if (liveCampaign?.chestReady || hasUnclaimedDrip(liveCampaign)) {
      return "campaign";
    }
    if (hasDaily) return "daily";
    return "campaign";
  }, [liveDaily, liveCampaign, hasDaily, hasCampaignPane, preferredTab]);

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
  const showTabs = hasDaily && hasCampaignPane;
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
            className="absolute inset-0 bg-black/70 backdrop-blur-[8px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("missions.drawerTitle")}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="relative z-10 flex max-h-[84dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-t-[3px] border-emerald-400/40 bg-linear-to-b from-[#0a1f14] via-[#0f172a] to-[#052e16] shadow-[0_-20px_50px_rgba(0,0,0,0.55)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-16deg, transparent, transparent 12px, #fff 12px, #fff 13px)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -end-16 top-0 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
            />
            {anyRewardReady && (
              <div
                aria-hidden
                className="pointer-events-none absolute -start-12 top-8 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl"
              />
            )}

            <header className="relative shrink-0 px-4 pb-2.5 pt-3">
              <div className="mb-2.5 flex justify-center">
                <span
                  aria-hidden
                  className="h-1.5 w-11 rounded-full bg-white/25"
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 bg-black/35 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
                      aria-hidden
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/hub-mission.png"
                        alt=""
                        draggable={false}
                        className="h-7 w-7 object-contain"
                      />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-xl font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                        {t("missions.drawerTitle")}
                      </h2>
                      <p
                        className={[
                          "mt-0.5 font-display text-xs font-bold",
                          anyRewardReady
                            ? "text-amber-200"
                            : "text-white/55",
                        ].join(" ")}
                      >
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
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 font-display text-base font-black text-white/70 transition-transform active:scale-95"
                  aria-label={t("common.close")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/close.png"
                    alt=""
                    draggable={false}
                    className="h-5 w-5 object-contain opacity-90"
                  />
                </button>
              </div>

              {showTabs && (
                <div
                  role="tablist"
                  aria-label={t("missions.drawerTitle")}
                  className="relative mt-3.5 grid grid-cols-2 gap-1 rounded-2xl border border-white/12 bg-black/40 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
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
                        label: t("missions.tabCampaign"),
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
                          "relative z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 font-display text-sm font-black transition-colors",
                          active ? "text-white" : "text-white/50",
                        ].join(" ")}
                      >
                        {active && (
                          <motion.span
                            layoutId="mission-tab-pill"
                            className="absolute inset-0 rounded-xl border border-emerald-400/35 bg-linear-to-b from-emerald-600/80 to-emerald-900/90 shadow-[0_2px_0_0_rgba(0,0,0,0.35)]"
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
                            "relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ring-1",
                            item.stats.ready
                              ? "bg-accent text-accent-foreground ring-amber-300/40"
                              : active
                                ? "bg-black/30 text-white/80 ring-white/15"
                                : "bg-white/10 text-white/50 ring-white/10",
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
              {!hasDaily && !hasCampaignPane && (
                <p className="rounded-2xl border border-white/12 bg-black/35 px-4 py-8 text-center font-display text-sm font-bold text-white/55">
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
                {tab === "campaign" && hasCampaignPane && (
                  <motion.div
                    key={`campaign-${liveCampaign?.batchId ?? "none"}-${campaignStats.done}-${chapters.length}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl border border-emerald-400/25 bg-black/35 px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                      <p className="font-display text-[11px] font-black uppercase tracking-widest text-emerald-300/90">
                        {t("campaign.eyebrow")}
                      </p>
                      <p className="mt-0.5 font-display text-sm font-bold text-white/85">
                        {t("campaign.drawerBlurb")}
                      </p>
                    </div>

                    {hasCampaign && liveCampaign && (
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
                    )}

                    {hasChapters && (
                      <div className="space-y-2">
                        <p className="font-display text-[11px] font-black uppercase tracking-wide text-white/45">
                          {t("campaign.chapters")}
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {chapters.map((ch, i) => {
                            const title =
                              locale === "fa" ? ch.titleFa : ch.titleEn;
                            return (
                              <li key={ch.id}>
                                <Link
                                  href={`/play/survival?challenge=${encodeURIComponent(ch.id)}`}
                                  onClick={close}
                                  className={[
                                    "flex min-h-12 items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition-transform active:scale-[0.98]",
                                    ch.conquered
                                      ? "border-emerald-400/30 bg-emerald-500/15"
                                      : ch.unlocked
                                        ? "border-white/12 bg-black/40"
                                        : "border-white/8 bg-black/25 opacity-70",
                                  ].join(" ")}
                                >
                                  <span
                                    className={[
                                      "flex h-9 w-9 items-center justify-center rounded-xl border font-display text-sm font-black",
                                      ch.conquered
                                        ? "border-emerald-400/40 bg-emerald-600/40 text-white"
                                        : "border-white/15 bg-black/40 text-white/70",
                                    ].join(" ")}
                                    aria-hidden
                                  >
                                    {ch.conquered ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src="/icons/trophy.png"
                                        alt=""
                                        draggable={false}
                                        className="h-5 w-5 object-contain"
                                      />
                                    ) : (
                                      toLocaleDigits(i + 1, locale)
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-white">
                                    {title}
                                  </span>
                                  <span
                                    className={[
                                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ring-1",
                                      ch.conquered
                                        ? "bg-emerald-500/25 text-emerald-200 ring-emerald-400/30"
                                        : ch.unlocked
                                          ? "bg-accent/90 text-accent-foreground ring-amber-300/35"
                                          : "bg-white/10 text-white/45 ring-white/10",
                                    ].join(" ")}
                                  >
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
                      </div>
                    )}
                  </motion.div>
                )}
                {!showTabs && hasDaily && !hasCampaignPane && liveDaily && (
                  <MissionBoard
                    key={`daily-solo-${liveDaily.batchId}-${dailyStats.done}`}
                    initialBoard={liveDaily}
                    variant="daily"
                    density="compact"
                    onDripClaimed={onEconomyUpdate}
                  />
                )}
                {!showTabs && hasCampaignPane && !hasDaily && (
                  <motion.div
                    key={`campaign-solo-${liveCampaign?.batchId ?? "ch"}`}
                    className="space-y-3"
                  >
                    {hasCampaign && liveCampaign && (
                      <MissionBoard
                        initialBoard={liveCampaign}
                        variant="campaign"
                        density="compact"
                        onDripClaimed={onEconomyUpdate}
                      />
                    )}
                    {hasChapters && (
                      <ul className="flex flex-col gap-1.5">
                        {chapters.map((ch, i) => (
                          <li key={ch.id}>
                            <Link
                              href={`/play/survival?challenge=${encodeURIComponent(ch.id)}`}
                              onClick={close}
                              className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-white/12 bg-black/40 px-2.5 py-2 transition-transform active:scale-[0.98]"
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/40 font-display text-sm font-black text-white/70">
                                {toLocaleDigits(i + 1, locale)}
                              </span>
                              <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-white">
                                {locale === "fa" ? ch.titleFa : ch.titleEn}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {activeStats.ready ? (
              <div className="relative shrink-0 border-t border-white/10 bg-[#071510]/95 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
                <motion.button
                  type="button"
                  disabled={claimingAll}
                  onClick={handleClaimAll}
                  animate={{ scale: [1, 1.015, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.35,
                    ease: "easeInOut",
                  }}
                  className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-300/50 bg-linear-to-b from-accent to-[hsl(38_92%_42%)] font-display text-base font-black text-accent-foreground shadow-[0_4px_0_0_rgba(120,70,0,0.55),0_0_24px_rgba(251,191,36,0.35)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(120,70,0,0.55)] disabled:opacity-60"
                  aria-label={
                    claimingAll
                      ? t("missions.claiming")
                      : claimableTotal > 1
                        ? t("missions.drawerClaimAll")
                        : t("missions.drawerClaimReward")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/claim.png"
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="h-9 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                  />
                  {claimingAll
                    ? t("missions.claiming")
                    : claimableTotal > 1
                      ? t("missions.drawerClaimAll")
                      : t("missions.drawerClaimReward")}
                </motion.button>
              </div>
            ) : continueHref ? (
              <div className="relative shrink-0 border-t border-white/10 bg-[#071510]/95 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
                <Link
                  href={continueHref}
                  onClick={close}
                  className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-400/40 bg-linear-to-b from-emerald-500 to-emerald-800 font-display text-base font-black text-white shadow-[0_4px_0_0_rgba(0,0,0,0.45),0_0_20px_rgba(16,185,129,0.3)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.45)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/target.png"
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="h-6 w-6 object-contain"
                  />
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
