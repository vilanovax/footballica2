"use client";

import { useState, useTransition, useEffect } from "react";
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
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { StatusBar } from "./StatusBar";
import { StadiumHero } from "./StadiumHero";
import { UpgradeCard } from "./UpgradeCard";
import { NewspaperModal } from "./NewspaperModal";
import { FtueCoach } from "./FtueCoach";
import { Confetti } from "./Confetti";
import {
  hasMissionRewardReady,
  MissionDrawer,
} from "@/components/profile/MissionDrawer";
import { DuelInboxBanner } from "@/components/duel/DuelInboxBanner";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

type ClubHubProps = {
  initialClub: ClubSnapshot;
  /** Soft-currency stamina top-up cost from GameConfig. */
  staminaRefillCost: number;
  /** Active Draft Duel turns waiting for the manager. */
  duelInboxCount?: number;
  duelInboxItems?: DuelInboxItem[];
  missionBoard?: EvaluateMissionsResult | null;
  dailyBoard?: EvaluateMissionsResult | null;
};

export function ClubHub({
  initialClub,
  staminaRefillCost,
  duelInboxCount = 0,
  duelInboxItems = [],
  missionBoard = null,
  dailyBoard = null,
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

  const canClaimNews = club.newsClaimable;
  const missionRewardReady = hasMissionRewardReady(dailyBoard, missionBoard);

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
      // A fresh claim spends today's ticket — stop the mailbox nagging.
      if (result.state === "fresh") {
        setClub((c) => ({ ...c, newsClaimable: false }));
        playSound("upgrade");
        haptic([30, 30, 60]);
      } else {
        haptic(HAPTIC.light);
      }
    });
  }

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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-36"
        style={clubAccentWashStyle(colorKey)}
      />
      <header className="relative flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label={t("profile.eyebrow")}
            className="shrink-0 rounded-full transition-transform active:scale-95"
            style={clubAccentRingStyle(colorKey)}
          >
            <AvatarImage
              avatarKey={avatarKey}
              colorKey={colorKey}
              className="h-14 w-14 rounded-full shadow-fantasy"
            />
          </Link>
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              {t("club.hubEyebrow")}
            </p>
            <h1 className="font-display text-2xl font-bold leading-tight text-foreground">
              {club.name}
            </h1>
            <p className="font-display text-xs font-semibold text-muted-foreground">
              {t("club.yourStadium")}
            </p>
          </div>
        </div>

        {/* Shop + Daily News show ONLY after FTUE completion (tutorialStep === 2).
            Daily News only nags (glow + bounce + unread dot) while today's
            headline is still claimable. */}
        {ftueComplete && (
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => {
                haptic(HAPTIC.light);
                setMissionsOpen(true);
              }}
              aria-label={t("missions.openDrawer")}
              className={[
                "relative flex h-12 w-12 items-center justify-center rounded-bubble border bg-surface text-2xl shadow-fantasy",
                missionRewardReady
                  ? "border-secondary"
                  : "border-primary/40",
              ].join(" ")}
              animate={
                missionRewardReady
                  ? {
                      y: [0, -3, 0],
                      boxShadow: [
                        "0 0 0px hsl(var(--secondary) / 0)",
                        "0 0 16px hsl(var(--secondary) / 0.55)",
                        "0 0 0px hsl(var(--secondary) / 0)",
                      ],
                    }
                  : undefined
              }
              transition={
                missionRewardReady
                  ? { repeat: Infinity, duration: 1.5 }
                  : undefined
              }
              whileTap={{ scale: 0.92 }}
            >
              <span aria-hidden>🎯</span>
              {missionRewardReady && (
                <span className="absolute -end-1 -top-1 h-3 w-3 rounded-full bg-secondary ring-2 ring-surface" />
              )}
            </motion.button>

            <Link
              href="/shop"
              aria-label={t("shop.title")}
              className="flex h-12 w-12 items-center justify-center rounded-bubble border border-primary/40 bg-surface text-2xl shadow-fantasy"
            >
              <span aria-hidden>🛒</span>
            </Link>

            <motion.button
              type="button"
              onClick={handleDailyNews}
              disabled={newsPending}
              aria-label={t("club.dailyNews")}
              className={[
                "relative flex h-12 w-12 items-center justify-center rounded-bubble border bg-surface text-2xl shadow-fantasy",
                canClaimNews ? "border-accent" : "border-border opacity-70",
              ].join(" ")}
              animate={
                canClaimNews
                  ? {
                      y: [0, -3, 0],
                      boxShadow: [
                        "0 0 0px hsl(var(--accent) / 0)",
                        "0 0 18px hsl(var(--accent) / 0.7)",
                        "0 0 0px hsl(var(--accent) / 0)",
                      ],
                    }
                  : undefined
              }
              transition={
                canClaimNews ? { repeat: Infinity, duration: 1.6 } : undefined
              }
              whileTap={{ scale: 0.92 }}
            >
              <span aria-hidden>{canClaimNews ? "📬" : "📭"}</span>
              {canClaimNews && (
                <span className="absolute -end-1 -top-1 h-3 w-3 rounded-full bg-secondary ring-2 ring-surface" />
              )}
            </motion.button>
          </div>
        )}
      </header>

      <StatusBar
        coins={club.coins}
        fans={club.fans}
        stamina={club.stamina}
        maxStamina={club.maxStamina}
        msUntilNext={club.msUntilNext}
        staminaRefillCost={staminaRefillCost}
        onClubUpdate={setClub}
      />

      {ftueComplete && (
        <DuelInboxBanner
          count={duelInboxCount}
          items={duelInboxItems}
          variant="club"
        />
      )}

      <StadiumHero
        stadiumLevel={club.stadiumLevel}
        celebrateKey={celebrateKey}
        celebrating={celebrating}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
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
          // FTUE step 1 funnels the player into the Stadium upgrade only.
          const isForcedStadium = step === 1 && def.key === "STADIUM";
          const locked =
            step === 0 || (step === 1 && def.key !== "STADIUM");
          return (
            <UpgradeCard
              key={def.key}
              def={def}
              level={level}
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

      {ftueComplete && (
        <MissionDrawer
          open={missionsOpen}
          onOpenChange={setMissionsOpen}
          dailyBoard={dailyBoard}
          missionBoard={missionBoard}
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
