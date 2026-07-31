"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type {
  MemoryAttemptSubmission,
  MemoryBoardJson,
  MemoryCard,
} from "@/lib/duel/memoryTypes";
import { useLanguageStore } from "@/stores/languageStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type MemoryBoardProps = {
  mode: "attack" | "defend";
  board: MemoryBoardJson;
  endsAt: string;
  revealMs?: number;
  pending?: boolean;
  onComplete: (attempt: MemoryAttemptSubmission) => void;
};

type CardState = "down" | "up" | "matched";

type Feedback =
  | { kind: "pair"; key: number }
  | { kind: "combo"; key: number; n: number }
  | { kind: "clear"; key: number }
  | null;

/**
 * Async MEMORY half — pitch-night arena, 4×4 footballer ↔ country.
 * Server grades matches; client auto-submits on timer end.
 */
export function MemoryBoard({
  mode,
  board,
  endsAt,
  revealMs = 2000,
  pending,
  onComplete,
}: MemoryBoardProps) {
  const { t, locale } = useTranslation();
  const lang = useLanguageStore((s) => s.locale);
  const reduceMotion = useReducedMotion();
  const startedAt = useRef(performance.now());
  const submitted = useRef(false);
  const feedbackKey = useRef(0);
  const totalSeconds = useRef(
    Math.max(
      1,
      Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000),
    ),
  );

  const [states, setStates] = useState<CardState[]>(() =>
    board.cards.map(() => "down"),
  );
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [pairsFound, setPairsFound] = useState(0);
  const [combo, setCombo] = useState(0);
  const [missShake, setMissShake] = useState(0);
  const [flips, setFlips] = useState<MemoryAttemptSubmission["flips"]>([]);
  const [matches, setMatches] = useState<MemoryAttemptSubmission["matches"]>(
    [],
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const flipsRef = useRef(flips);
  const matchesRef = useRef(matches);
  flipsRef.current = flips;
  matchesRef.current = matches;

  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)),
  );

  const isAttack = mode === "attack";
  const hurry = secondsLeft > 0 && secondsLeft <= 5;
  const critical = secondsLeft > 0 && secondsLeft <= 3;

  const theme = useMemo(
    () =>
      isAttack
        ? {
            flood: "from-orange-500/35 via-amber-400/10",
            badge: "bg-orange-500 text-white shadow-orange-500/40",
            ring: "stroke-orange-400",
            ringTrack: "stroke-orange-400/20",
            bar: "from-orange-400 to-amber-300",
            barGlow: "shadow-[0_0_18px_rgba(251,146,60,0.55)]",
            score: "text-orange-300",
            cta: "btn-fantasy-primary",
            matchRing: "ring-amber-300/70",
            matchBg: "from-amber-400/35 to-emerald-600/40",
            pickRing: "ring-orange-300",
          }
        : {
            flood: "from-sky-400/30 via-teal-400/10",
            badge: "bg-sky-500 text-white shadow-sky-500/40",
            ring: "stroke-sky-400",
            ringTrack: "stroke-sky-400/20",
            bar: "from-sky-400 to-teal-300",
            barGlow: "shadow-[0_0_18px_rgba(56,189,248,0.5)]",
            score: "text-sky-300",
            cta: "btn-fantasy-secondary",
            matchRing: "ring-teal-300/70",
            matchBg: "from-teal-400/35 to-emerald-600/40",
            pickRing: "ring-sky-300",
          },
    [isAttack],
  );

  const pairPct = (pairsFound / Math.max(1, board.pairCount)) * 100;
  const timePct = Math.min(
    100,
    (secondsLeft / totalSeconds.current) * 100,
  );
  const ringR = 34;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - pairPct / 100);

  function finish(timedOut: boolean) {
    if (submitted.current || pending) return;
    submitted.current = true;
    onComplete({
      flips: flipsRef.current,
      matches: matchesRef.current,
      durationMs: Math.round(performance.now() - startedAt.current),
      timedOut,
    });
  }

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        finishRef.current(true);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (pairsFound >= board.pairCount && !submitted.current) {
      feedbackKey.current += 1;
      setFeedback({ kind: "clear", key: feedbackKey.current });
      window.setTimeout(() => finish(false), reduceMotion ? 200 : 550);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submit once on clear
  }, [pairsFound, board.pairCount]);

  function cardLabel(card: MemoryCard): string {
    return lang === "fa" ? card.labelFa : card.labelEn;
  }

  function pulseFeedback(next: Exclude<Feedback, null>) {
    setFeedback(next);
    window.setTimeout(() => {
      setFeedback((cur) => (cur?.key === next.key ? null : cur));
    }, 900);
  }

  function handleFlip(card: MemoryCard, index: number) {
    if (pending || locked || submitted.current) return;
    if (states[index] !== "down") return;
    if (openIds.includes(card.id)) return;
    if (openIds.length >= 2) return;

    const atMs = Math.round(performance.now() - startedAt.current);
    setFlips((prev) => [...prev, { cardId: card.id, atMs }]);
    setStates((prev) => {
      const next = [...prev];
      next[index] = "up";
      return next;
    });

    const nextOpen = [...openIds, card.id];
    setOpenIds(nextOpen);
    playSound("click");
    haptic(HAPTIC.tap);

    if (nextOpen.length < 2) return;

    setLocked(true);
    const [idA, idB] = nextOpen;
    const a = board.cards.find((c) => c.id === idA)!;
    const b = board.cards.find((c) => c.id === idB)!;
    const isMatch = a.pairKey === b.pairKey && a.face !== b.face;

    window.setTimeout(() => {
      if (isMatch) {
        setStates((prev) =>
          prev.map((s, i) => {
            const c = board.cards[i]!;
            return c.id === idA || c.id === idB ? "matched" : s;
          }),
        );
        setMatches((prev) => [
          ...prev,
          { cardA: idA!, cardB: idB!, atMs },
        ]);
        setPairsFound((n) => n + 1);
        setCombo((c) => {
          const next = c + 1;
          feedbackKey.current += 1;
          if (next >= 2) {
            pulseFeedback({
              kind: "combo",
              key: feedbackKey.current,
              n: next,
            });
          } else {
            pulseFeedback({ kind: "pair", key: feedbackKey.current });
          }
          return next;
        });
        playSound("goal");
        haptic(HAPTIC.goal);
      } else {
        setCombo(0);
        setMissShake((n) => n + 1);
        setStates((prev) =>
          prev.map((s, i) => {
            const c = board.cards[i]!;
            if (c.id === idA || c.id === idB) return "down";
            return s;
          }),
        );
        playSound("miss");
        haptic(HAPTIC.miss);
      }
      setOpenIds([]);
      setLocked(false);
    }, revealMs);
  }

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Pitch night arena */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#071410]" />
        <div
          className={`absolute inset-x-0 top-0 h-48 bg-linear-to-b ${theme.flood} to-transparent`}
        />
        <div className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 28px, rgba(255,255,255,0.09) 28px 29px), repeating-linear-gradient(0deg, transparent 0 36px, rgba(255,255,255,0.05) 36px 37px)",
          }}
        />
        <div className="absolute inset-x-[12%] top-[38%] h-px bg-white/15" />
        <div className="absolute start-1/2 top-[28%] h-[44%] w-px -translate-x-1/2 bg-white/12" />
        <div className="absolute start-1/2 top-[48%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/50 to-transparent" />
      </div>

      {/* HUD */}
      <header className="relative z-10 flex items-center gap-3 px-3 pt-3">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={ringR}
              fill="none"
              strokeWidth="6"
              className={theme.ringTrack}
            />
            <motion.circle
              cx="40"
              cy="40"
              r={ringR}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={theme.ring}
              strokeDasharray={ringC}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-display text-xl font-black tabular-nums leading-none ${theme.score}`}
            >
              {toLocaleDigits(pairsFound, locale)}
            </span>
            <span className="font-display text-[10px] font-bold text-white/45">
              /{toLocaleDigits(board.pairCount, locale)}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-extrabold uppercase tracking-wide shadow-lg ${theme.badge}`}
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-white"
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [1, 0.35, 1], scale: [1, 1.3, 1] }
              }
              transition={{ repeat: Infinity, duration: 1.1 }}
            />
            {mode === "attack"
              ? t("duel.memory.attackBadge")
              : t("duel.memory.defendBadge")}
          </span>
          <h2 className="mt-1.5 font-display text-xl font-black text-white drop-shadow-md">
            {t("duel.memory.title")}
          </h2>
          <p className="mt-0.5 font-body text-xs font-semibold text-white/55">
            {t("duel.memory.pairsCleared", {
              n: toLocaleDigits(pairsFound, locale),
              total: toLocaleDigits(board.pairCount, locale),
            })}
          </p>
        </div>

        {combo >= 2 && (
          <motion.div
            initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="shrink-0 rounded-2xl bg-amber-400 px-2.5 py-2 text-center shadow-[0_0_20px_rgba(251,191,36,0.45)]"
          >
            <p className="font-display text-[10px] font-bold uppercase text-amber-950/70">
              combo
            </p>
            <p className="font-display text-lg font-black leading-none text-amber-950 tabular-nums">
              ×{toLocaleDigits(combo, locale)}
            </p>
          </motion.div>
        )}
      </header>

      {/* Fuse timer */}
      <div className="relative z-10 mx-3 mt-3">
        <div className="overflow-hidden rounded-full bg-black/40 p-0.5 ring-1 ring-white/10">
          <motion.div
            className={[
              "h-2.5 rounded-full bg-linear-to-r",
              theme.bar,
              hurry ? theme.barGlow : "",
              critical ? "bg-linear-to-r from-rose-500 to-orange-400" : "",
            ].join(" ")}
            animate={{ width: `${timePct}%` }}
            transition={{ duration: 0.15, ease: "linear" }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between px-0.5">
          <p className="font-body text-[11px] font-semibold text-white/40">
            {t("duel.memory.hint")}
          </p>
          <motion.p
            animate={
              critical && !reduceMotion
                ? { scale: [1, 1.08, 1], color: ["#fda4af", "#fff", "#fda4af"] }
                : undefined
            }
            transition={{ repeat: Infinity, duration: 0.55 }}
            className={[
              "font-display text-sm font-black tabular-nums",
              hurry ? "text-rose-300" : "text-white/85",
            ].join(" ")}
          >
            {hurry ? `${t("duel.memory.timerHurry")} · ` : ""}
            {t("duel.memory.timer", {
              s: toLocaleDigits(secondsLeft, locale),
            })}
          </motion.p>
        </div>
      </div>

      {/* Card pitch */}
      <motion.div
        key={missShake}
        animate={
          missShake > 0 && !reduceMotion
            ? { x: [0, -6, 6, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.35 }}
        className="relative z-10 mx-auto mt-3 grid w-full max-w-md flex-1 content-center grid-cols-4 gap-2 px-3"
        role="grid"
        aria-label={t("duel.memory.title")}
      >
        {board.cards.map((card, index) => {
          const state = states[index]!;
          const faceUp = state === "up" || state === "matched";
          const selected = state === "up";
          const matched = state === "matched";

          return (
            <motion.button
              key={card.id}
              type="button"
              initial={
                reduceMotion ? false : { opacity: 0, y: 14, scale: 0.92 }
              }
              animate={{ opacity: 1, y: 0, scale: matched ? 1.02 : 1 }}
              transition={{
                delay: reduceMotion ? 0 : index * 0.025,
                type: "spring",
                stiffness: 360,
                damping: 22,
              }}
              disabled={
                pending || locked || state !== "down" || submitted.current
              }
              onClick={() => handleFlip(card, index)}
              whileTap={
                state === "down" && !locked
                  ? { scale: 0.94 }
                  : undefined
              }
              className="relative aspect-square min-h-[44px] min-w-[44px] [perspective:900px]"
              aria-label={faceUp ? cardLabel(card) : t("duel.memory.cardBack")}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 280, damping: 20 }
                }
              >
                {/* Back — jersey kit */}
                <div
                  className={[
                    "absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.45)] [backface-visibility:hidden] ring-2",
                    selected
                      ? theme.pickRing
                      : "ring-white/15",
                    "bg-linear-to-br from-[#0f3d2e] via-[#0a241c] to-[#061510]",
                  ].join(" ")}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/memory-ball.png"
                    alt=""
                    draggable={false}
                    className="relative h-9 w-9 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                  />
                </div>

                {/* Front */}
                <div
                  className={[
                    "absolute inset-0 flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl px-1 shadow-[0_8px_20px_rgba(0,0,0,0.4)] [backface-visibility:hidden] [transform:rotateY(180deg)] ring-2",
                    matched
                      ? `${theme.matchRing} bg-linear-to-br ${theme.matchBg}`
                      : "ring-white/25 bg-linear-to-br from-slate-800 to-slate-950",
                  ].join(" ")}
                >
                  {matched && (
                    <motion.span
                      aria-hidden
                      initial={{ opacity: 0.8, scale: 0.6 }}
                      animate={{ opacity: 0, scale: 1.6 }}
                      transition={{ duration: 0.55 }}
                      className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-300/30"
                    />
                  )}
                  {card.face === "PLAYER" && card.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.art}
                      alt=""
                      className="h-9 w-9 object-contain drop-shadow-md"
                    />
                  ) : card.face === "COUNTRY" && card.art ? (
                    <span className="text-[1.65rem] leading-none drop-shadow" aria-hidden>
                      {card.art}
                    </span>
                  ) : (
                    <span className="text-lg">❓</span>
                  )}
                  <span className="line-clamp-2 text-center font-display text-[9px] font-extrabold leading-tight text-white">
                    {cardLabel(card)}
                  </span>
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Floating callouts */}
      <div className="pointer-events-none absolute inset-x-0 top-[42%] z-30 flex justify-center">
        <AnimatePresence mode="popLayout">
          {feedback && (
            <motion.div
              key={feedback.key}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 16, scale: 0.7 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className={[
                "rounded-2xl px-4 py-2 font-display text-lg font-black shadow-2xl",
                feedback.kind === "combo"
                  ? "bg-amber-400 text-amber-950"
                  : feedback.kind === "clear"
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-white text-emerald-800",
              ].join(" ")}
            >
              {feedback.kind === "combo"
                ? t("duel.memory.combo", {
                    n: toLocaleDigits(feedback.n, locale),
                  })
                : feedback.kind === "clear"
                  ? t("duel.memory.boardClear")
                  : t("duel.memory.pairFound")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dock CTA */}
      <div className="relative z-10 mt-auto border-t border-white/10 bg-black/35 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button
          type="button"
          disabled={pending || submitted.current}
          onClick={() => finish(false)}
          className={[
            "btn-fantasy w-full min-h-12 font-display text-base font-black shadow-fantasy active:scale-[0.98]",
            theme.cta,
            pending || submitted.current ? "opacity-60" : "",
          ].join(" ")}
        >
          {pending ? "…" : t("duel.memory.submitEarly")}
        </button>
        <p className="mt-1.5 text-center font-body text-[10px] font-semibold text-white/40">
          {t("duel.memory.submitHint")}
        </p>
      </div>
    </section>
  );
}
