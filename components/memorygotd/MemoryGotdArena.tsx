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
    return (
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[#071410]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-teal-400/25 to-transparent" />
        </div>

        <header className="relative z-10 px-3 pt-3">
          <p className="inline-flex items-center rounded-full bg-teal-400 px-2.5 py-1 font-display text-[11px] font-extrabold text-teal-950">
            {t("memoryGotd.badge")}
          </p>
          <h1 className="mt-2 font-display text-2xl font-black text-white">
            {t("memoryGotd.title")}
          </h1>
        </header>

        <div className="relative z-10 mt-8 flex flex-1 flex-col items-center gap-4 px-4">
          <p className="font-display text-xl font-black text-white">
            {memory.status === "SOLVED"
              ? t("memoryGotd.solved")
              : t("memoryGotd.failed")}
          </p>
          <p className="font-display text-base font-bold text-teal-200">
            {t("memoryGotd.pairsResult", {
              n: toLocaleDigits(memory.pairsFound, locale),
              total: toLocaleDigits(memory.pairCount, locale),
            })}
          </p>
          <p className="font-display text-sm font-bold text-amber-200/90">
            🔥{" "}
            {t("memoryGotd.streak", {
              n: toLocaleDigits(memory.memoryStreak, locale),
            })}
          </p>
          {memory.shareCode && (
            <pre className="rounded-2xl bg-black/35 px-4 py-3 font-display text-lg text-white/85 ring-1 ring-white/10">
              {memory.shareCode}
            </pre>
          )}
          <Link
            href="/play"
            className="btn-fantasy btn-fantasy-primary mt-4 flex min-h-touch w-full max-w-sm items-center justify-center"
          >
            {t("memoryGotd.backPlay")}
          </Link>
        </div>

        <GotdResultModal
          open={showResult && done}
          outcome={memory.status === "SOLVED" ? "SOLVED" : "FAILED"}
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
          <div className="absolute inset-0 bg-[#071410]" />
          <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-teal-400/30 to-transparent" />
        </div>

        <header className="relative z-10 px-3 pt-3">
          <p className="inline-flex items-center rounded-full bg-teal-400 px-2.5 py-1 font-display text-[11px] font-extrabold text-teal-950">
            {t("memoryGotd.badge")}
          </p>
          <h1 className="mt-2 font-display text-2xl font-black text-white">
            {t("memoryGotd.title")}
          </h1>
          <p className="mt-1 font-body text-sm font-bold text-white/70">
            {t("memoryGotd.hint", {
              n: toLocaleDigits(memory.pairCount, locale),
              s: toLocaleDigits(Math.round(memory.turnMs / 1000), locale),
            })}
          </p>
        </header>

        <div className="relative z-10 mt-8 flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/memory-ball.png"
            alt=""
            draggable={false}
            className="h-24 w-24 object-contain drop-shadow-[0_8px_24px_rgba(45,212,191,0.35)]"
          />
          <p className="text-center font-display text-sm font-bold text-white/55">
            {t("memoryGotd.readyBlurb")}
          </p>
          <p className="font-display text-xs font-bold text-amber-200/80">
            🔥{" "}
            {t("memoryGotd.streak", {
              n: toLocaleDigits(memory.memoryStreak, locale),
            })}
          </p>
          <button
            type="button"
            onClick={() => {
              playSound("click");
              setStarted(true);
            }}
            className="btn-fantasy btn-fantasy-accent mt-2 flex min-h-12 w-full max-w-sm items-center justify-center font-display text-base font-extrabold"
          >
            {t("memoryGotd.startCta")}
          </button>
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
