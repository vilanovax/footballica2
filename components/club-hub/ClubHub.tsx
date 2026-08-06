"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { upgradeClub } from "@/actions/upgradeClub";
import {
  claimDailyNews,
  type NewsPayload,
  type NewsState,
} from "@/actions/claimDailyNews";
import {
  UPGRADE_LIST,
  getClubLevel,
  getUpgradeCost,
  type ClubSnapshot,
  type UpgradeKey,
} from "@/lib/club/upgrades";
import { type AvatarKey } from "@/lib/onboarding/avatars";
import {
  clubAccentRingStyle,
  clubAccentWashStyle,
  DEFAULT_CLUB_COLOR_KEY,
} from "@/lib/onboarding/clubColors";
import { AvatarImage } from "@/components/common/AvatarImage";
import { HubIcon } from "@/components/common/HubIcon";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { countMissionRewardsReady } from "@/lib/game/missionRewards";
import { StatusBar } from "./StatusBar";
import { StadiumHero } from "./StadiumHero";
import { UpgradeCard } from "./UpgradeCard";
import { NewspaperModal } from "./NewspaperModal";
import { ActiveNewsChip } from "./ActiveNewsChip";
import { FtueCoach } from "./FtueCoach";
import { DuelInboxBanner } from "@/components/duel/DuelInboxBanner";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import type { CampaignSeasonView } from "@/lib/game/campaignSeason";
import { NextGoalCard } from "@/components/club-hub/NextGoalCard";
import { MysteryDailyChip } from "@/components/club-hub/MysteryDailyChip";
import { CampaignSeasonCard } from "@/components/club-hub/CampaignSeasonCard";

// Heavy / deferred hub panels — keep first Club paint lean.
const BusinessPanel = dynamic(() =>
  import("@/components/club-hub/BusinessPanel").then((m) => m.BusinessPanel),
);
const MissionDrawer = dynamic(() =>
  import("@/components/profile/MissionDrawer").then((m) => m.MissionDrawer),
);
const Confetti = dynamic(() =>
  import("./Confetti").then((m) => m.Confetti),
);

type ClubHubProps = {
  initialClub: ClubSnapshot;
  /** Soft-currency stamina top-up cost from GameConfig. */
  staminaRefillCost: number;
  /** Typical coins from a win — drives Next Goal wins-away. */
  coinsPerWin: number;
  /** Active Draft Duel turns waiting for the manager. */
  duelInboxCount?: number;
  duelInboxItems?: DuelInboxItem[];
  missionBoard?: EvaluateMissionsResult | null;
  dailyBoard?: EvaluateMissionsResult | null;
  /** ADR 002 Campaign metagame snapshot (missions + RecordChallenge chapters). */
  campaignSeason?: CampaignSeasonView | null;
};

export function ClubHub({
  initialClub,
  staminaRefillCost,
  coinsPerWin,
  duelInboxCount = 0,
  duelInboxItems = [],
  missionBoard = null,
  dailyBoard = null,
  campaignSeason = null,
}: ClubHubProps) {
  const { t, locale } = useTranslation();
  const [club, setClub] = useState(initialClub);
  const [pendingKey, setPendingKey] = useState<UpgradeKey | null>(null);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Transient "You're ready!" greeting shown once on the 1 → 2 transition.
  const [justGraduated, setJustGraduated] = useState(false);
  const [, startTransition] = useTransition();

  const step = club.tutorialStep;
  const avatarKey = (club.avatar ?? "TACTICAL_COACH") as AvatarKey;
  const avatarName = t(`avatars.${avatarKey}.name`);
  const colorKey = club.colorKey ?? DEFAULT_CLUB_COLOR_KEY;
  // Daily News only unlocks once the FTUE is fully complete (tutorialStep 2).
  const ftueComplete = step === 2;

  // Newspaper booster state
  const [news, setNews] = useState<{
    payload: NewsPayload | null;
    state: NewsState;
  } | null>(null);
  const [newsPending, setNewsPending] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  // Keep drawer mounted after first open so exit animation works, but skip
  // downloading the MissionDrawer chunk until the manager taps missions.
  const [missionsMounted, setMissionsMounted] = useState(false);
  const [missionsTab, setMissionsTab] = useState<"daily" | "campaign">(
    "daily",
  );

  const openMissions = (tab: "daily" | "campaign") => {
    setMissionsTab(tab);
    setMissionsMounted(true);
    setMissionsOpen(true);
  };

  const canClaimNews = club.newsClaimable;
  const missionReadyCount = countMissionRewardsReady(dailyBoard, missionBoard);
  const newsAutoOpenedRef = useRef(false);

  // Replay onboarding whistle once after createClub redirect (tutorialStep 0).
  useEffect(() => {
    if (step !== 0) return;
    try {
      if (sessionStorage.getItem("fb_onboard_chime") === "1") {
        sessionStorage.removeItem("fb_onboard_chime");
        playSound("whistle");
      }
    } catch {
      /* private mode */
    }
  }, [step]);

  function handleDailyNews() {
    if (newsPending) return;
    setError(null);
    setNewsPending(true);
    startTransition(async () => {
      const result = await claimDailyNews();
      setNewsPending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNews({ payload: result.news, state: result.state });
      // Fresh / still-active → sync hub chip; cooldown clears claimable.
      if (result.state === "fresh" || result.state === "active") {
        const payload = result.news;
        setClub((c) => ({
          ...c,
          newsClaimable: false,
          activeNewsBooster: payload
            ? {
                type: payload.type,
                multiplier: payload.multiplier,
                headline: payload.headline,
                expiresAt: payload.expiresAt,
              }
            : c.activeNewsBooster,
        }));
        if (result.state === "fresh") {
          playSound("upgrade");
          haptic([30, 30, 60]);
        } else {
          haptic(HAPTIC.light);
        }
      } else {
        setClub((c) => ({ ...c, newsClaimable: false }));
        haptic(HAPTIC.light);
      }
    });
  }

  // Auto-open today's Newspaper once FTUE is done and the day is claimable.
  useEffect(() => {
    if (!ftueComplete || !canClaimNews || newsAutoOpenedRef.current) return;
    if (news || newsPending) return;
    newsAutoOpenedRef.current = true;
    handleDailyNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on hub land
  }, [ftueComplete, canClaimNews]);

  function handleUpgrade(key: UpgradeKey) {
    if (pendingKey) return;
    setError(null);
    setPendingKey(key);

    startTransition(async () => {
      const result = await upgradeClub(key);
      setPendingKey(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // FTUE graduation: the forced first upgrade just flipped step 1 → 2.
      if (step === 1 && result.club.tutorialStep === 2) {
        setJustGraduated(true);
        playSound("upgrade");
        haptic([30, 40, 60]);
        window.setTimeout(() => setJustGraduated(false), 3200);
      }

      setClub(result.club);
      setCelebrateKey((k) => k + 1);
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 1700);

      playSound("upgrade");
      haptic(HAPTIC.tap);
    });
  }

  return (
    <section className="relative flex flex-1 flex-col gap-4">
      {/* Hub top bar — same dark game chrome as campaign / business cards */}
      <div className="relative overflow-hidden rounded-bubble-xl border-[3px] border-emerald-500/35 bg-linear-to-br from-[#052e16] via-[#14532d] to-[#0f172a] p-2.5 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
          aria-hidden
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-40"
          style={clubAccentWashStyle(colorKey)}
        />

        <header className="relative flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/profile"
              aria-label={t("profile.eyebrow")}
              className="shrink-0 rounded-full transition-transform active:scale-95"
              style={clubAccentRingStyle(colorKey)}
            >
              <AvatarImage
                avatarKey={avatarKey}
                colorKey={colorKey}
                priority
                sizes="48px"
                className="h-12 w-12 rounded-full shadow-[0_3px_0_0_rgba(0,0,0,0.35)] ring-2 ring-white/20"
              />
            </Link>
            <h1 className="truncate font-display text-lg font-black leading-tight text-white drop-shadow-sm sm:text-xl">
              {club.name}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 rounded-2xl border border-white/12 bg-black/25 p-0.5">
            {ftueComplete && (
              <>
                <motion.button
                  type="button"
                  onClick={() => {
                    haptic(HAPTIC.light);
                    openMissions("daily");
                  }}
                  aria-label={t("missions.openDrawer")}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl"
                  whileTap={{ scale: 0.9 }}
                >
                  <HubIcon kind="mission" size="md" priority />
                  {missionReadyCount > 0 && (
                    <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-display text-[10px] font-black text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                      {toLocaleDigits(Math.min(missionReadyCount, 9), locale)}
                      {missionReadyCount > 9 ? "+" : ""}
                    </span>
                  )}
                </motion.button>

                <Link
                  href="/shop"
                  aria-label={t("shop.title")}
                  onClick={() => playSound("click")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl active:scale-90"
                >
                  <HubIcon kind="shop" size="md" />
                </Link>

                <motion.button
                  type="button"
                  onClick={handleDailyNews}
                  disabled={newsPending}
                  aria-label={t("club.dailyNews")}
                  className={[
                    "relative flex h-10 w-10 items-center justify-center rounded-xl",
                    canClaimNews ? "" : "opacity-55",
                  ].join(" ")}
                  whileTap={{ scale: 0.9 }}
                >
                  <HubIcon kind="news" size="md" />
                  {canClaimNews && (
                    <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-display text-[10px] font-black text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                      {toLocaleDigits(1, locale)}
                    </span>
                  )}
                </motion.button>
              </>
            )}

            <Link
              href="/settings"
              aria-label={t("nav.settings")}
              onClick={() => playSound("click")}
              className="flex h-10 w-10 items-center justify-center rounded-xl active:scale-90"
            >
              <HubIcon kind="settings" size="md" />
            </Link>
          </div>
        </header>

        <div className="relative mt-2.5">
          <StatusBar
            coins={club.coins}
            stamina={club.stamina}
            maxStamina={club.maxStamina}
            msUntilNext={club.msUntilNext}
            medicalLevel={club.medicalLevel}
            staminaRefillCost={staminaRefillCost}
            onClubUpdate={setClub}
          />
        </div>
      </div>

      {ftueComplete && (
        <MysteryDailyChip mysteryStreak={club.mysteryStreak} />
      )}

      {ftueComplete && campaignSeason && (
        <CampaignSeasonCard
          season={campaignSeason}
          onOpenMissions={() => openMissions("campaign")}
        />
      )}

      <AnimatePresence>
        {ftueComplete && club.activeNewsBooster && (
          <ActiveNewsChip
            key={club.activeNewsBooster.expiresAt}
            booster={club.activeNewsBooster}
            onOpen={handleDailyNews}
            onExpired={() =>
              setClub((c) => ({ ...c, activeNewsBooster: null }))
            }
          />
        )}
      </AnimatePresence>

      {ftueComplete && (
        <DuelInboxBanner
          count={duelInboxCount}
          items={duelInboxItems}
          variant="club"
        />
      )}

      <StadiumHero
        stadiumLevel={club.stadiumLevel}
        fans={club.fans}
        trainingGroundLevel={club.trainingGroundLevel}
        medicalLevel={club.medicalLevel}
        maxStamina={club.maxStamina}
        celebrateKey={celebrateKey}
        celebrating={celebrating}
      />

      {ftueComplete && (
        <NextGoalCard
          coinsPerWin={coinsPerWin}
          milestoneInput={{
            coins: club.coins,
            stadiumLevel: club.stadiumLevel,
            medicalLevel: club.medicalLevel,
            trainingGroundLevel: club.trainingGroundLevel,
          }}
        />
      )}

      {ftueComplete && (
        <BusinessPanel club={club} onClubUpdate={setClub} />
      )}

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-black text-foreground">
            {t("club.upgrades")}
          </h2>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="font-display text-xs font-bold text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {UPGRADE_LIST.map((def) => {
          const level = getClubLevel(club, def.key);
          const cost = getUpgradeCost(def.key, level);
          const canAfford = cost !== null && club.coins >= cost;
          const isForcedStadium = step === 1 && def.key === "STADIUM";
          const locked =
            step === 0 || (step === 1 && def.key !== "STADIUM");
          return (
            <UpgradeCard
              key={def.key}
              def={def}
              level={level}
              maxStamina={club.maxStamina}
              cost={cost}
              canAfford={canAfford}
              pending={pendingKey === def.key}
              locked={locked}
              spotlight={isForcedStadium}
              onUpgrade={() => handleUpgrade(def.key)}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {news && (
          <NewspaperModal
            key="newspaper"
            news={news.payload}
            state={news.state}
            onClaim={() => setNews(null)}
          />
        )}
      </AnimatePresence>

      {ftueComplete && missionsMounted && (
        <MissionDrawer
          open={missionsOpen}
          onOpenChange={setMissionsOpen}
          preferredTab={missionsTab}
          dailyBoard={dailyBoard}
          missionBoard={missionBoard}
          chapters={campaignSeason?.chapters ?? []}
          onEconomyUpdate={(balances) => {
            // Tick Hub coins when flying coins land on the status pill.
            window.setTimeout(() => {
              setClub((c) => ({ ...c, coins: balances.coins }));
            }, 820);
          }}
        />
      )}

      {/* FTUE Step 0 — full mask + coach CTA (above bottom nav, centered). */}
      <AnimatePresence>
        {step === 0 && (
          <motion.div
            key="ftue-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 pb-[calc(theme(spacing.nav)+1rem)] backdrop-blur-sm sm:pb-4"
          >
            <FtueCoach
              avatarKey={avatarKey}
              name={avatarName}
              line={t("ftue.step0Line")}
              cta={{
                href: "/play/penalty?tutorial=true",
                label: t("ftue.step0Cta"),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FTUE Step 1 — dim the hub, spotlight the Stadium card (raised above). */}
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            key="ftue-dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[1px]"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            key="ftue-coach-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4"
          >
            <FtueCoach
              avatarKey={avatarKey}
              name={avatarName}
              line={t("ftue.step1Line")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FTUE graduation — coach toast + confetti (clears bottom nav). */}
      <AnimatePresence>
        {justGraduated && (
          <motion.div
            key="ftue-graduated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-4 pb-[calc(theme(spacing.nav)+1rem)] sm:items-start sm:pt-3 sm:pb-0"
          >
            <div className="relative w-full max-w-mobile">
              <Confetti />
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.9, 1.04, 1] }}
                transition={{ duration: 0.45 }}
              >
                <FtueCoach
                  avatarKey={avatarKey}
                  name={avatarName}
                  line={t("ftue.gradLine")}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
