"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { DailyStarPathSnapshot } from "@/actions/starpath/getDailyStarPath";
import { submitStarPathGuess } from "@/actions/starpath/submitStarPathGuess";
import type { GotdRewardsPayload } from "@/lib/game/gotdRewards";
import { STAR_PATH_SCORE_BY_CLUES } from "@/lib/starpath/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { GotdResultModal } from "@/components/play/GotdResultModal";

type Props = {
  initial: DailyStarPathSnapshot;
};

/**
 * Star Path arena — sequential club clues + Mystery-style search dock.
 */
export function StarPathArena({ initial }: Props) {
  const { t, locale } = useTranslation();
  const [starPath, setStarPath] = useState(initial);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rewards, setRewards] = useState<GotdRewardsPayload | null>(null);
  const [previousStreak, setPreviousStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const done =
    starPath.status === "SOLVED" || starPath.status === "FAILED";
  const guessedIds = useMemo(
    () => new Set(starPath.guesses.map((g) => g.playerId)),
    [starPath.guesses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return starPath.options
      .filter((o) => !guessedIds.has(o.id))
      .filter((o) => {
        if (!q) return true;
        return (
          o.nameEn.toLowerCase().includes(q) ||
          o.nameFa.includes(query.trim()) ||
          o.club.toLowerCase().includes(q)
        );
      })
      .slice(0, 24);
  }, [starPath.options, guessedIds, query]);

  const selectedLabel = useMemo(() => {
    const o = starPath.options.find((x) => x.id === selectedId);
    if (!o) return null;
    return locale === "fa" ? o.nameFa : o.nameEn;
  }, [selectedId, starPath.options, locale]);

  const nextScore =
    STAR_PATH_SCORE_BY_CLUES[starPath.cluesRevealed] ?? 25;

  function handleGuess() {
    if (!selectedId || pending || done) return;
    startTransition(async () => {
      const res = await submitStarPathGuess(selectedId);
      if (!res.ok) {
        if (res.error === "duplicate_guess") {
          toast.error(t("starPath.errDuplicate"));
        } else if (res.error === "already_done") {
          toast.error(t("starPath.errDone"));
        } else {
          toast.error(t("starPath.errGeneric"));
        }
        return;
      }
      setStarPath(res.starPath);
      setQuery("");
      setSelectedId(null);
      const terminal =
        res.starPath.status === "SOLVED" ||
        res.starPath.status === "FAILED";
      if (res.starPath.status === "SOLVED") {
        playSound("goal");
        haptic(HAPTIC.goal);
      } else if (res.starPath.status === "FAILED") {
        playSound("miss");
        haptic(HAPTIC.miss);
      } else {
        playSound("miss");
        haptic(HAPTIC.miss);
      }
      if (terminal) {
        setRewards(res.rewards);
        setPreviousStreak(res.previousStreak);
        setShowResult(true);
      }
    });
  }

  const answerName =
    starPath.answer &&
    (locale === "fa" ? starPath.answer.nameFa : starPath.answer.nameEn);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#0a1218]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-amber-500/25 to-transparent" />
      </div>

      <header className="relative z-10 flex items-start justify-between gap-3 px-1 pt-1">
        <div className="min-w-0">
          <p className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 font-display text-[11px] font-extrabold text-amber-950">
            {t("starPath.badge")}
          </p>
          <h1 className="mt-2 font-display text-2xl font-black text-white">
            {t("starPath.title")}
          </h1>
          <p className="mt-1 font-body text-sm font-bold text-white/70">
            {t("starPath.hint")}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/15">
          <p className="font-display text-lg font-black tabular-nums text-amber-300">
            {done
              ? toLocaleDigits(starPath.score, locale)
              : toLocaleDigits(nextScore, locale)}
          </p>
          <p className="font-display text-[10px] font-bold text-white/50">
            {done ? t("starPath.scoreLabel") : t("starPath.nextScore")}
          </p>
        </div>
      </header>

      {/* Club path */}
      <div className="relative z-10 mt-5 flex flex-col gap-2 px-0.5">
        <p className="font-display text-[11px] font-extrabold uppercase tracking-widest text-white/45">
          {t("starPath.pathLabel", {
            n: toLocaleDigits(starPath.cluesRevealed, locale),
            max: toLocaleDigits(starPath.maxClues, locale),
          })}
        </p>
        <ol className="flex flex-col gap-2">
          {Array.from({ length: starPath.maxClues }).map((_, i) => {
            const step = starPath.visiblePath[i];
            const locked = !step;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: locale === "fa" ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={[
                  "flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5",
                  locked
                    ? "border-white/10 bg-white/5"
                    : "border-amber-400/40 bg-amber-400/15",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-black",
                    locked
                      ? "bg-white/10 text-white/40"
                      : "bg-amber-400 text-amber-950",
                  ].join(" ")}
                >
                  {toLocaleDigits(i + 1, locale)}
                </span>
                <span
                  className={[
                    "min-w-0 flex-1 font-display text-base font-black",
                    locked ? "text-white/35" : "text-white",
                  ].join(" ")}
                >
                  {locked ? t("starPath.clueLocked") : step.name}
                </span>
                {i < starPath.maxClues - 1 && (
                  <span aria-hidden className="text-white/30">
                    ↓
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>

      {done && (
        <div className="relative z-10 mt-6 flex flex-col items-center gap-3 px-1">
          <p className="font-display text-xl font-black text-white">
            {starPath.status === "SOLVED"
              ? t("starPath.solved")
              : t("starPath.failed")}
          </p>
          {answerName && (
            <p className="font-display text-lg font-bold text-amber-200">
              {answerName}
            </p>
          )}
          <Link
            href="/play"
            className="btn-fantasy btn-fantasy-primary flex min-h-touch w-full items-center justify-center"
          >
            {t("starPath.backPlay")}
          </Link>
        </div>
      )}

      <GotdResultModal
        open={showResult && done}
        outcome={starPath.status === "SOLVED" ? "SOLVED" : "FAILED"}
        kind="starPath"
        rewards={rewards}
        previousStreak={previousStreak}
        currentStreak={starPath.starPathStreak}
        shareCode={starPath.shareCode}
        onClose={() => setShowResult(false)}
      />

      {!done && <div aria-hidden className="h-52 shrink-0" />}

      {!done && (
        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-full max-w-mobile px-3 pt-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        >
          <div className="pointer-events-auto rounded-t-bubble-lg border border-white/10 bg-[#0c1016] px-2 pt-2.5 shadow-[0_-12px_32px_rgba(0,0,0,0.55)]">
            <p className="mb-1.5 text-center font-display text-[11px] font-bold text-white/55">
              {selectedLabel
                ? `✓ ${selectedLabel}`
                : t("starPath.pickHint")}
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              placeholder={t("starPath.searchPlaceholder")}
              className="min-h-11 w-full rounded-2xl bg-white/8 px-3 font-display text-sm font-bold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:ring-2 focus:ring-amber-400/45"
            />
            <ul className="mt-1.5 max-h-28 overflow-y-auto rounded-2xl bg-black/30 ring-1 ring-white/10">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-center font-display text-xs font-bold text-white/40">
                  …
                </li>
              ) : (
                filtered.map((o) => {
                  const active = selectedId === o.id;
                  const label = locale === "fa" ? o.nameFa : o.nameEn;
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(o.id);
                          playSound("click");
                        }}
                        className={[
                          "flex w-full min-h-11 items-center justify-between gap-2 px-3 py-2 text-start font-display text-sm font-bold",
                          active
                            ? "bg-amber-500/20 text-amber-100"
                            : "text-white/90 hover:bg-white/8",
                        ].join(" ")}
                      >
                        <span className="truncate">{label}</span>
                        <span className="shrink-0 text-[11px] font-semibold text-white/40">
                          {o.club}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <button
              type="button"
              disabled={!selectedId || pending}
              onClick={handleGuess}
              className="btn-fantasy btn-fantasy-accent mt-2 mb-1 min-h-12 w-full justify-center disabled:opacity-50"
            >
              {pending ? "…" : t("starPath.guessCta")}
            </button>
          </div>
        </motion.footer>
      )}
    </section>
  );
}
