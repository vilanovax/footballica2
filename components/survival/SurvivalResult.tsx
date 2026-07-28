"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  settleSurvival,
  type SettleSurvivalResult,
} from "@/actions/match/settleSurvival";
import type { KickSubmission } from "@/lib/quiz/scoring";
import type { SurvivalEndReason } from "@/lib/game/survival";
import { calculateLevel } from "@/lib/game/economy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { PostMatchSummary } from "@/components/match/PostMatchSummary";
import type { PostMatchTrophy } from "@/components/match/postMatchTypes";

type SurvivalResultProps = {
  categoryId: string;
  endReason: SurvivalEndReason;
  submissions: KickSubmission[];
  challengeId?: string | null;
  onPlayAgain: () => void;
  onExit: () => void;
};

type SaveState =
  | { status: "saving" }
  | { status: "saved"; data: Extract<SettleSurvivalResult, { ok: true }> }
  | { status: "error"; message: string };

export function SurvivalResult({
  categoryId,
  endReason,
  submissions,
  challengeId = null,
  onPlayAgain,
  onExit,
}: SurvivalResultProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [save, setSave] = useState<SaveState>({ status: "saving" });
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    void (async () => {
      const result = await settleSurvival({
        categoryId,
        submissions,
        endReason,
        challengeId,
      });
      if (result.ok) {
        setSave({ status: "saved", data: result });
        router.refresh();
      } else {
        setSave({ status: "error", message: result.error });
      }
    })();
  }, [categoryId, endReason, submissions, challengeId, router]);

  if (save.status === "saving") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          className="text-6xl"
          aria-hidden
        >
          ❤️
        </motion.div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t("result.saving")}
        </h1>
      </section>
    );
  }

  if (save.status === "error") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="font-display text-lg font-bold text-destructive">
          {t("survival.settleError")}
        </p>
        <p className="text-sm text-muted-foreground">{save.message}</p>
        <button
          type="button"
          onClick={onExit}
          className="btn-fantasy btn-fantasy-primary"
        >
          {t("survival.backLobby")}
        </button>
      </section>
    );
  }

  const { data } = save;
  const cleared = data.rewards.endReason === "cleared";
  const catName =
    locale === "fa" ? data.category.nameFa : data.category.nameEn;

  const missionCoins = data.missions?.missionRewards.coins ?? 0;
  const missionXp = data.missions?.missionRewards.xp ?? 0;
  const matchXp = data.rewards.xp;
  const prevProgress = calculateLevel(
    data.balances.xp - matchXp - missionXp,
  ).progress;
  const barFrom = data.levelUp ? 0 : prevProgress;

  const bonusLines = [
    data.rewards.boosterCoinBonus > 0
      ? {
          key: "boosterCoin",
          label: t("result.boosterBonus"),
          amount: data.rewards.boosterCoinBonus,
          unit: "💰",
        }
      : null,
    data.rewards.boosterFanBonus > 0
      ? {
          key: "boosterFan",
          label: t("result.boosterBonus"),
          amount: data.rewards.boosterFanBonus,
          unit: "📣",
        }
      : null,
    missionCoins > 0
      ? {
          key: "missionCoins",
          label: t("result.missionCoins"),
          amount: missionCoins,
          unit: "💰",
        }
      : null,
    missionXp > 0
      ? {
          key: "missionXp",
          label: t("result.missionXp"),
          amount: missionXp,
          unit: "XP",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    amount: number;
    unit: string;
  }>;

  const trophies: PostMatchTrophy[] = [];
  if (data.isNewRecord) {
    trophies.push({
      key: "record",
      emoji: "📈",
      title: t("result.newRecordTrophy"),
      subtitle: t("survival.newRecord", {
        n: toLocaleDigits(data.rewards.score, locale),
      }),
    });
  }
  if (data.challenge?.conquered) {
    trophies.push({
      key: "challenge",
      emoji: data.challenge.badgeEmoji ?? "🏆",
      title: t("result.challengeConquered"),
      subtitle: t("survival.challengeConquered", {
        n: toLocaleDigits(data.challenge.targetScore, locale),
      }),
    });
  }

  const challengeBadges =
    data.challenge?.badgeGranted && data.challenge.badgeSlug
      ? [
          {
            slug: data.challenge.badgeSlug,
            emoji: data.challenge.badgeEmoji ?? "🏅",
            imageUrl: null,
            nameEn: data.challenge.badgeSlug,
            nameFa: data.challenge.badgeSlug,
            descriptionEn: t("result.challengeBadge"),
            descriptionFa: t("result.challengeBadge"),
            coins: 0,
            xp: 0,
          },
        ]
      : [];

  const chips = [
    {
      key: "score",
      label: `${t("survival.score")} ${toLocaleDigits(data.rewards.score, locale)}`,
      tone: "accent" as const,
    },
    data.rewards.bestCombo >= 2
      ? {
          key: "combo",
          label: `⚡ ×${toLocaleDigits(data.rewards.bestCombo, locale)}`,
          tone: "secondary" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    tone: "accent" | "secondary";
  }>;

  const streakNote = data.streak.extended
    ? data.streak.dailyStreak > 1
      ? t("result.streakExtended", {
          n: toLocaleDigits(data.streak.dailyStreak, locale),
        })
      : t("result.streakStarted")
    : null;

  return (
    <PostMatchSummary
      outcome={{
        emoji: cleared ? "🏆" : "💔",
        title: cleared
          ? t("survival.clearedTitle")
          : t("survival.eliminatedTitle"),
        subtitle: `${data.category.icon || "📚"} ${catName}`,
        hint: cleared ? t("survival.clearedBody") : t("survival.eliminatedBody"),
        hintTone: cleared ? "positive" : "negative",
        chips,
      }}
      rewards={{
        coins: data.rewards.coins + missionCoins,
        xp: data.rewards.xp + missionXp,
        fans: data.rewards.fans,
        bonusLines,
        balances: {
          coins: data.balances.coins,
          fans: data.balances.fans,
          stamina: data.balances.stamina,
          maxStamina: data.balances.maxStamina,
        },
      }}
      achievements={{
        level: {
          level: data.level.level,
          currentLevelXp: data.level.currentLevelXp,
          nextLevelXp: data.level.nextLevelXp,
          progress: data.level.progress,
          barFrom,
          levelUp: data.levelUp,
        },
        badges: challengeBadges,
        trophies,
        missions: data.missions,
        streakNote,
      }}
      celebrateBadges={challengeBadges.length > 0}
      ctas={{
        primary: {
          label: t("survival.playAgain"),
          onClick: onPlayAgain,
          variant: "primary",
        },
        secondary: {
          label: t("survival.backLobby"),
          onClick: onExit,
          variant: "accent",
        },
      }}
    />
  );
}
