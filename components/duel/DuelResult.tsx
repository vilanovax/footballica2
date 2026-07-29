"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import { toScorecard } from "@/lib/duel/toScorecard";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { DuelScorecard } from "./DuelScorecard";
import { PostMatchSummary } from "@/components/match/PostMatchSummary";
import { getMyMissions } from "@/actions/missions";
import { startDuel } from "@/actions/duel/startDuel";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type DuelResultProps = {
  duel: DuelSnapshot;
  /** From the submit that finished the duel; otherwise fetched on mount. */
  missions?: EvaluateMissionsResult | null;
};

export function DuelResult({ duel, missions: initialMissions }: DuelResultProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const data = toScorecard(duel);
  const [pending, startTransition] = useTransition();
  const [missions, setMissions] = useState<EvaluateMissionsResult | null>(
    initialMissions ?? null,
  );

  useEffect(() => {
    if (initialMissions) {
      setMissions(initialMissions);
      return;
    }
    void getMyMissions().then((res) => {
      if (res.ok) setMissions(res.board);
    });
  }, [initialMissions]);

  function handleRematch() {
    if (pending) return;
    startTransition(async () => {
      const res = await startDuel();
      if (!res.ok) {
        const key =
          res.error === "no_stamina"
            ? "duel.errStamina"
            : res.error === "not_enough_categories"
              ? "duel.errCategories"
              : "duel.errGeneric";
        toast.error(t(key));
        return;
      }
      haptic(HAPTIC.goal);
      playSound("whistle");
      router.push(`/play/duel/${res.duel.id}`);
    });
  }

  async function handleShare() {
    const text = `${data.you.name} ${data.youScore}–${data.themScore} ${data.them.name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Footballica", text });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("duel.scorecard.share"));
    } catch {
      toast.message(text);
    }
  }

  const missionBoard =
    missions &&
    (initialMissions
      ? missions
      : {
          ...missions,
          updates: missions.missions
            .filter((m) => m.progress > 0 || m.isCompleted)
            .slice(0, 3)
            .map((m) => ({
              missionId: m.missionId,
              titleEn: m.titleEn,
              titleFa: m.titleFa,
              progress: m.progress,
              targetValue: m.targetValue,
              isCompleted: m.isCompleted,
              justCompleted: m.isCompleted,
              delta: 0,
            })),
        });

  const missionCoins = initialMissions?.missionRewards.coins ?? 0;
  const missionXp = initialMissions?.missionRewards.xp ?? 0;
  const won = data.outcome === "WIN";
  const weeklyXp =
    won && DEFAULT_GAME_CONFIG.duel.winWeeklyXp > 0
      ? DEFAULT_GAME_CONFIG.duel.winWeeklyXp
      : 0;

  const title =
    data.outcome === "WIN"
      ? t("duel.resultWin")
      : data.outcome === "DRAW"
        ? t("duel.resultDraw")
        : t("duel.resultLose");
  const emoji =
    data.outcome === "WIN" ? "🏆" : data.outcome === "DRAW" ? "🤝" : "🧤";

  const bonusLines = [
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
    weeklyXp > 0
      ? {
          key: "weekly",
          label: t("result.weeklyXpBonus"),
          amount: weeklyXp,
          unit: "XP",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    amount: number;
    unit: string;
  }>;

  return (
    <PostMatchSummary
      outcome={{
        emoji,
        title,
        subtitle: `${toLocaleDigits(data.youScore, locale)} – ${toLocaleDigits(data.themScore, locale)}`,
        hintTone:
          data.outcome === "WIN"
            ? "positive"
            : data.outcome === "LOSE"
              ? "negative"
              : "neutral",
        children: (
          <DuelScorecard
            data={{ ...data, status: "COMPLETED" }}
            hideFooter
            hideOutcomeBanner
          />
        ),
      }}
      rewards={{
        coins: missionCoins,
        xp: missionXp,
        fans: 0,
        bonusLines,
      }}
      achievements={{
        missions: missionBoard,
        trophies:
          weeklyXp > 0
            ? [
                {
                  key: "weekly",
                  emoji: "📅",
                  title: t("result.weeklyXpBonus"),
                  subtitle: `+${toLocaleDigits(weeklyXp, locale)}`,
                },
              ]
            : [],
      }}
      celebrateBadges={false}
      ctas={{
        primary: {
          label: pending ? t("duel.starting") : t("duel.scorecard.rematch"),
          onClick: handleRematch,
          disabled: pending,
          variant: "primary",
        },
        secondary: {
          label: t("duel.backLobby"),
          onClick: () => router.push("/play/duel"),
          variant: "accent",
        },
        tertiary: {
          label: t("duel.scorecard.share"),
          onClick: () => void handleShare(),
          variant: "secondary",
        },
      }}
    />
  );
}
