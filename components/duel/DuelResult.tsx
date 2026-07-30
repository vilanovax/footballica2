"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import { toScorecard } from "@/lib/duel/toScorecard";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { DuelScorecard } from "./DuelScorecard";
import { MissionProgressBanner } from "@/components/missions/MissionProgressBanner";
import { getMyMissions } from "@/actions/missions";
import { startDuel } from "@/actions/duel/startDuel";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type DuelResultProps = {
  duel: DuelSnapshot;
  missions?: EvaluateMissionsResult | null;
};

/**
 * Dedicated Draft Duel result arena — one composition, no loot-pile clutter.
 * Headline score = rounds won; sticky dock stays clear of the board.
 */
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
            .slice(0, 2)
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

  const showMissions =
    missionBoard &&
    (missionBoard.updates.length > 0 || missionBoard.chestReady);

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
  const glowClass =
    data.outcome === "WIN"
      ? "from-emerald-500/30"
      : data.outcome === "DRAW"
        ? "from-amber-500/25"
        : "from-rose-500/25";
  const titleClass =
    data.outcome === "WIN"
      ? "text-emerald-200"
      : data.outcome === "DRAW"
        ? "text-amber-200"
        : "text-rose-200";

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Arena atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-[#1a2433] via-[#121820] to-[#0a0f14]" />
        <div
          className={[
            "absolute inset-x-0 top-0 h-56 bg-linear-to-b via-transparent to-transparent",
            glowClass,
          ].join(" ")}
        />
        <div className="absolute -inset-s-20 top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -inset-e-16 bottom-32 h-52 w-52 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pt-3">
        {/* Outcome hero — compact, brand of this result */}
        <motion.header
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="mb-3 flex flex-col items-center text-center"
        >
          <motion.span
            aria-hidden
            className="text-5xl drop-shadow-lg"
            animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 0.55 }}
          >
            {emoji}
          </motion.span>
          <h1
            className={["mt-2 font-display text-2xl font-black", titleClass].join(
              " ",
            )}
          >
            {title}
          </h1>
          <p className="mt-1 font-display text-sm font-bold text-white/50">
            {t("duel.resultSub", {
              you: toLocaleDigits(data.youScore, locale),
              them: toLocaleDigits(data.themScore, locale),
            })}
          </p>
        </motion.header>

        <DuelScorecard
          data={{ ...data, status: "COMPLETED" }}
          hideFooter
          hideOutcomeBanner
          variant="result"
        />

        {/* Loot / XP — only when something actually dropped */}
        {weeklyXp > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3"
          >
            <span aria-hidden>📅</span>
            <p className="font-display text-sm font-bold text-amber-100">
              {t("result.weeklyXpBonus")}
            </p>
            <span className="font-display text-sm font-black text-amber-300">
              +{toLocaleDigits(weeklyXp, locale)} XP
            </span>
          </motion.div>
        )}

        {!won && weeklyXp === 0 && (
          <p className="mt-3 px-1 text-center font-display text-[11px] font-semibold text-white/40">
            {t("duel.scorecard.noLoot")}
          </p>
        )}

        {showMissions && missionBoard && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-3 mb-1"
          >
            <p className="mb-2 px-1 font-display text-[11px] font-bold uppercase tracking-widest text-white/40">
              {t("duel.scorecard.missionsNudge")}
            </p>
            <MissionProgressBanner missions={missionBoard} />
          </motion.div>
        )}

        {/* Spacer for sticky dock + bottom nav */}
        <div
          aria-hidden
          className="h-[calc(7.25rem+theme(spacing.nav)+env(safe-area-inset-bottom,0px))] shrink-0"
        />
      </div>

      {/* Sticky dock — Rematch + (Back | Share) so content never sits under 3 full buttons */}
      <motion.footer
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-mobile px-3 pb-[calc(theme(spacing.nav)+env(safe-area-inset-bottom,0px))] pt-2"
      >
        <div className="pointer-events-auto flex flex-col gap-2 rounded-t-3xl border-t border-white/10 bg-[#0c1218]/95 px-1 pt-3 backdrop-blur-md">
          <button
            type="button"
            disabled={pending}
            onClick={handleRematch}
            className="btn-fantasy btn-fantasy-primary min-h-touch w-full justify-center text-base disabled:opacity-50"
          >
            {pending ? t("duel.starting") : t("duel.scorecard.rematch")}
          </button>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={() => router.push("/play/duel")}
              className="min-h-touch rounded-2xl border border-amber-300/40 bg-amber-400/15 px-4 font-display text-sm font-bold text-amber-100 transition-transform active:scale-[0.98]"
            >
              {t("duel.backLobby")}
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              aria-label={t("duel.scorecard.share")}
              className="min-h-touch min-w-touch rounded-2xl border border-white/15 bg-white/8 px-4 font-display text-sm font-bold text-white/80 transition-transform active:scale-[0.98]"
            >
              {t("duel.scorecard.share")}
            </button>
          </div>
        </div>
      </motion.footer>
    </section>
  );
}
