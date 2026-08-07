"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { DailyMemorySnapshot } from "@/actions/memorygotd/getDailyMemory";
import { submitMemoryGotd } from "@/actions/memorygotd/submitMemoryGotd";
import type { MemoryAttemptSubmission } from "@/lib/duel/memoryTypes";
import type { GotdRewardsPayload } from "@/lib/game/gotdRewards";
import { MemoryBoard } from "@/components/duel/MemoryBoard";
import { GotdResultModal } from "@/components/play/GotdResultModal";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import {
  GameChip,
  GameCta,
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";

type Props = {
  initial: DailyMemorySnapshot;
};

/**
 * Memory Game of the Day arena — single timed board clear.
 * Reuses duel MemoryBoard UI; settles via submitMemoryGotd.
 */
export function MemoryGotdArena({ initial }: Props) {
  const { t, locale } = useTranslation();
  const [memory, setMemory] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [rewards, setRewards] = useState<GotdRewardsPayload | null>(null);
  const [previousStreak, setPreviousStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [started, setStarted] = useState(false);

  const done = memory.status === "SOLVED" || memory.status === "FAILED";

  const endsAt = useMemo(() => {
    if (!started || done) return "";
    return new Date(Date.now() + memory.turnMs).toISOString();
  }, [started, done, memory.turnMs]);

  function handleComplete(attempt: MemoryAttemptSubmission) {
    if (pending || done) return;
    startTransition(async () => {
      const res = await submitMemoryGotd(attempt);
      if (!res.ok) {
        if (res.error === "already_done") {
          toast.error(t("memoryGotd.errDone"));
        } else if (res.error === "disabled") {
          toast.error(t("memoryGotd.errDisabled"));
        } else {
          toast.error(t("memoryGotd.errGeneric"));
        }
        return;
      }
      setMemory(res.memory);
      setRewards(res.rewards);
      setPreviousStreak(res.previousStreak);
      setShowResult(true);
      if (res.memory.status === "SOLVED") {
        playSound("goal");
        haptic(HAPTIC.goal);
      } else {
        playSound("miss");
        haptic(HAPTIC.miss);
      }
    });
  }

  if (done) {
    const solved = memory.status === "SOLVED";
    return (
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-arena" />
          <div className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-teal-400/28 via-emerald-500/10 to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
            }}
          />
        </div>

        <header className="relative z-10 mx-3 mt-[max(0.5rem,env(safe-area-inset-top))]">
          <GamePanel tone="sky" className="p-3.5">
            <div className="relative flex items-center gap-3">
              <GameIconWell
                size="md"
                src="/icons/memory-ball.png"
                className="h-12 w-12"
                iconClassName="h-7 w-7"
              />
              <div className="min-w-0 flex-1">
                <GameChip tone="emerald">{t("memoryGotd.badge")}</GameChip>
                <h1 className="mt-1.5 font-display text-2xl font-black text-white">
                  {t("memoryGotd.title")}
                </h1>
              </div>
            </div>
          </GamePanel>
        </header>

        <div className="relative z-10 mt-6 flex flex-1 flex-col items-center gap-3 px-4">
          <GamePanel
            tone={solved ? "emerald" : "rose"}
            className="w-full max-w-sm p-5 text-center"
          >
            <GameIconWell
              size="lg"
              amber={solved}
              src={solved ? "/icons/done.png" : "/icons/broken-heart.png"}
              className="mx-auto h-16 w-16"
              iconClassName="h-9 w-9"
            />
            <p className="mt-3 font-display text-xl font-black text-white">
              {solved ? t("memoryGotd.solved") : t("memoryGotd.failed")}
            </p>
            <p className="mt-1 font-display text-base font-bold text-teal-100/90">
              {t("memoryGotd.pairsResult", {
                n: toLocaleDigits(memory.pairsFound, locale),
                total: toLocaleDigits(memory.pairCount, locale),
              })}
            </p>
            <GameChip tone="amber" className="mt-3 gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/streak.png"
                alt=""
                draggable={false}
                className="h-3.5 w-3.5 object-contain"
              />
              {t("memoryGotd.streak", {
                n: toLocaleDigits(memory.memoryStreak, locale),
              })}
            </GameChip>
            {memory.shareCode ? (
              <pre className="mt-3 rounded-2xl bg-black/35 px-4 py-3 font-display text-lg text-white/85 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
                {memory.shareCode}
              </pre>
            ) : null}
          </GamePanel>

          <Link
            href="/play"
            className="game-cta game-cta-primary mt-2 flex min-h-touch w-full max-w-sm items-center justify-center"
          >
            {t("memoryGotd.backPlay")}
          </Link>
        </div>

        <GotdResultModal
          open={showResult && done}
          outcome={solved ? "SOLVED" : "FAILED"}
          kind="memory"
          rewards={rewards}
          previousStreak={previousStreak}
          currentStreak={memory.memoryStreak}
          shareCode={memory.shareCode}
          onClose={() => setShowResult(false)}
        />
      </section>
    );
  }

  if (!started) {
    return (
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-arena" />
          <div className="absolute inset-x-0 top-0 h-52 bg-linear-to-b from-teal-400/32 via-sky-500/10 to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
            }}
          />
        </div>

        <header className="relative z-10 mx-3 mt-[max(0.5rem,env(safe-area-inset-top))]">
          <GamePanel tone="sky" className="p-3.5">
            <div className="relative flex items-center gap-3">
              <GameIconWell
                size="md"
                src="/icons/memory-ball.png"
                className="h-12 w-12"
                iconClassName="h-7 w-7"
              />
              <div className="min-w-0 flex-1">
                <GameChip tone="emerald">{t("memoryGotd.badge")}</GameChip>
                <h1 className="mt-1.5 font-display text-2xl font-black text-white">
                  {t("memoryGotd.title")}
                </h1>
                <p className="mt-1 font-display text-xs font-bold text-white/65">
                  {t("memoryGotd.hint", {
                    n: toLocaleDigits(memory.pairCount, locale),
                    s: toLocaleDigits(Math.round(memory.turnMs / 1000), locale),
                  })}
                </p>
              </div>
            </div>
          </GamePanel>
        </header>

        <div className="relative z-10 mt-8 flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-8">
          <GameIconWell
            size="xl"
            src="/icons/memory-ball.png"
            className="h-24 w-24"
            iconClassName="h-14 w-14"
          />
          <p className="max-w-xs text-center font-display text-sm font-bold text-white/60">
            {t("memoryGotd.readyBlurb")}
          </p>
          <GameChip tone="amber" className="gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/streak.png"
              alt=""
              draggable={false}
              className="h-3.5 w-3.5 object-contain"
            />
            {t("memoryGotd.streak", {
              n: toLocaleDigits(memory.memoryStreak, locale),
            })}
          </GameChip>
          <GameCta
            variant="accent"
            block
            onClick={() => {
              playSound("click");
              haptic(HAPTIC.tap);
              setStarted(true);
            }}
            className="mt-2 max-w-sm text-base"
          >
            {t("memoryGotd.startCta")}
          </GameCta>
          <Link
            href="/play"
            className="font-display text-sm font-bold text-white/45 underline-offset-2 hover:underline"
          >
            {t("common.back")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <MemoryBoard
      mode="attack"
      board={memory.board}
      endsAt={endsAt}
      revealMs={memory.revealMs}
      pending={pending}
      onComplete={handleComplete}
    />
  );
}
