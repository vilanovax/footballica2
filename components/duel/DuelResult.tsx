"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import { toScorecard } from "@/lib/duel/toScorecard";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { DuelScorecard } from "./DuelScorecard";
import { MissionProgressBanner } from "@/components/missions/MissionProgressBanner";
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
  const { t } = useTranslation();
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

  const showMissions =
    missions &&
    (missions.updates.length > 0 ||
      missions.chestReady ||
      (!initialMissions && missions.missions.some((m) => m.progress > 0)));

  return (
    <div className="flex flex-1 flex-col gap-3">
      <DuelScorecard
        data={{
          ...data,
          status: "COMPLETED",
          ctaLabel: pending
            ? t("duel.starting")
            : t("duel.scorecard.rematch"),
        }}
        onPrimaryAction={handleRematch}
        onSecondaryAction={() => router.push("/play/duel")}
      />
      <button
        type="button"
        onClick={() => void handleShare()}
        className="min-h-touch rounded-bubble border border-border bg-surface px-4 py-2.5 font-display text-sm font-bold text-muted-foreground transition-transform active:scale-[0.98]"
      >
        {t("duel.scorecard.share")}
      </button>
      {showMissions && missions && (
        <MissionProgressBanner
          missions={
            initialMissions
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
                }
          }
        />
      )}
    </div>
  );
}
