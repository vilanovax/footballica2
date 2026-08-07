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
import {
  GameChip,
  GameCta,
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";
import { cn } from "@/lib/utils";

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
 * Async MEMORY half — Arena pitch, 4×4 footballer ↔ country.
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
            flood: "from-amber-400/35 via-orange-500/12",
            panelTone: "amber" as const,
            ring: "stroke-amber-400",
            ringTrack: "stroke-amber-400/25",
            bar: "from-amber-400 to-orange-300",
            score: "text-amber-200",
            cta: "accent" as const,
            pickRing: "shadow-[0_0_0_2px_rgba(251,191,36,0.85),0_4px_0_0_rgba(0,0,0,0.4)]",
            matchGlow: "shadow-[0_0_0_2px_rgba(251,191,36,0.7),0_5px_0_0_rgba(0,0,0,0.35)]",
            matchWash: "from-amber-400/40 to-emerald-700/50",
          }
        : {
            flood: "from-sky-400/30 via-teal-400/12",
            panelTone: "sky" as const,
            ring: "stroke-sky-400",
            ringTrack: "stroke-sky-400/25",
            bar: "from-sky-400 to-teal-300",
            score: "text-sky-200",
            cta: "primary" as const,
            pickRing: "shadow-[0_0_0_2px_rgba(56,189,248,0.85),0_4px_0_0_rgba(0,0,0,0.4)]",
            matchGlow: "shadow-[0_0_0_2px_rgba(45,212,191,0.75),0_5px_0_0_rgba(0,0,0,0.35)]",
            matchWash: "from-teal-400/40 to-emerald-700/50",
          },
    [isAttack],
  );

  const pairPct = (pairsFound / Math.max(1, board.pairCount)) * 100;
  const timePct = Math.min(
    100,
    (secondsLeft / totalSeconds.current) * 100,
  );
  const ringR = 30;
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
        <div className="absolute inset-0 bg-arena" />
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-52 bg-linear-to-b to-transparent",
            theme.flood,
          )}
        />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
        />
        {/* Pitch markings under the grid */}
        <div className="absolute inset-x-[10%] top-[42%] h-px bg-white/12" />
        <div className="absolute start-1/2 top-[32%] h-[40%] w-px -translate-x-1/2 bg-white/10" />
        <div className="absolute start-1/2 top-[52%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.1)]" />
        <div
          className={cn(
            "absolute -inset-e-10 top-16 h-36 w-36 rounded-full blur-3xl",
            isAttack ? "bg-amber-400/20" : "bg-sky-400/18",
          )}
        />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black/70 to-transparent" />
      </div>

      {/* HUD */}
      <header className="relative z-10 mx-3 mt-[max(0.5rem,env(safe-area-inset-top))]">
        <GamePanel tone={theme.panelTone} className="px-3 py-2.5">
          <div className="relative flex items-center gap-3">
            {/* Pair progress ring */}
            <div className="relative h-[4.25rem] w-[4.25rem] shrink-0">
              <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={ringR}
                  fill="none"
                  strokeWidth="7"
                  className={theme.ringTrack}
                />
                <motion.circle
                  cx="40"
                  cy="40"
                  r={ringR}
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className={theme.ring}
                  strokeDasharray={ringC}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ type: "spring", stiffness: 140, damping: 22 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/35">
                <span
                  className={cn(
                    "font-display text-xl font-black tabular-nums leading-none",
                    theme.score,
                  )}
                >
                  {toLocaleDigits(pairsFound, locale)}
                </span>
                <span className="mt-0.5 font-display text-[10px] font-bold text-white/50">
                  /{toLocaleDigits(board.pairCount, locale)}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <GameChip
                tone={isAttack ? "amber" : "emerald"}
                className="uppercase tracking-wide"
              >
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-current"
                  animate={
                    reduceMotion
                      ? undefined
                      : { opacity: [1, 0.35, 1], scale: [1, 1.25, 1] }
                  }
                  transition={{ repeat: Infinity, duration: 1.1 }}
                />
                {isAttack
                  ? t("duel.memory.attackBadge")
                  : t("duel.memory.defendBadge")}
              </GameChip>
              <h2 className="mt-1.5 font-display text-xl font-black leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                {t("duel.memory.title")}
              </h2>
              <p className="mt-0.5 font-display text-[11px] font-bold text-white/60">
                {t("duel.memory.hint")}
              </p>
            </div>

            {combo >= 2 ? (
              <motion.div
                initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="shrink-0 rounded-2xl bg-accent px-2.5 py-2 text-center shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
              >
                <p className="font-display text-[9px] font-bold uppercase tracking-wide text-accent-foreground/70">
                  combo
                </p>
                <p className="font-display text-lg font-black leading-none text-accent-foreground tabular-nums">
                  ×{toLocaleDigits(combo, locale)}
                </p>
              </motion.div>
            ) : (
              <GameIconWell
                size="md"
                amber={isAttack}
                src="/icons/memory-ball.png"
                className="h-12 w-12 shrink-0"
                iconClassName="h-7 w-7"
              />
            )}
          </div>
        </GamePanel>
      </header>

      {/* Fuse timer */}
      <div className="relative z-10 mx-3 mt-2.5">
        <div
          className={cn(
            "overflow-hidden rounded-full bg-black/50 p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
            hurry && "shadow-[0_0_0_1px_rgba(251,113,133,0.45)]",
          )}
        >
          <motion.div
            className={cn(
              "h-2.5 rounded-full bg-linear-to-r",
              critical
                ? "from-rose-500 to-orange-400"
                : theme.bar,
              hurry && !critical && "shadow-[0_0_14px_rgba(251,146,60,0.55)]",
            )}
            animate={{ width: `${timePct}%` }}
            transition={{ duration: 0.15, ease: "linear" }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
          <p className="font-display text-[11px] font-bold text-white/45">
            {t("duel.memory.pairsCleared", {
              n: toLocaleDigits(pairsFound, locale),
              total: toLocaleDigits(board.pairCount, locale),
            })}
          </p>
          <motion.p
            animate={
              critical && !reduceMotion
                ? { scale: [1, 1.06, 1] }
                : undefined
            }
            transition={{ repeat: Infinity, duration: 0.5 }}
            className={cn(
              "inline-flex items-center gap-1 font-display text-sm font-black tabular-nums",
              hurry ? "text-rose-300" : "text-white/90",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/timer.png"
              alt=""
              draggable={false}
              className="h-4 w-4 object-contain opacity-90"
            />
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
            ? { x: [0, -7, 7, -4, 4, 0] }
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
          const isPlayer = card.face === "PLAYER";

          return (
            <motion.button
              key={card.id}
              type="button"
              initial={
                reduceMotion ? false : { opacity: 0, y: 12, scale: 0.9 }
              }
              animate={{
                opacity: matched ? 0.92 : 1,
                y: 0,
                scale: matched ? 0.97 : 1,
              }}
              transition={{
                delay: reduceMotion ? 0 : index * 0.022,
                type: "spring",
                stiffness: 380,
                damping: 22,
              }}
              disabled={
                pending || locked || state !== "down" || submitted.current
              }
              onClick={() => handleFlip(card, index)}
              whileTap={
                state === "down" && !locked ? { scale: 0.93, y: 2 } : undefined
              }
              className="relative aspect-square min-h-touch min-w-touch [perspective:1000px]"
              aria-label={faceUp ? cardLabel(card) : t("duel.memory.cardBack")}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 22 }
                }
              >
                {/* Back — kit tile */}
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl [backface-visibility:hidden]",
                    "bg-linear-to-br from-arena-mid via-arena-deep to-arena",
                    selected
                      ? theme.pickRing
                      : "shadow-[0_0_0_1px_rgba(52,211,153,0.28),0_5px_0_0_rgba(0,0,0,0.4)]",
                  )}
                >
                  <div
                    aria-hidden
                    className="absolute inset-[14%] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_0_0_1px_rgba(255,255,255,0.06)]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-[28%] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, transparent 42%, rgba(255,255,255,0.14) 50%, transparent 58%)",
                    }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/memory-ball.png"
                    alt=""
                    draggable={false}
                    className="relative h-8 w-8 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
                  />
                </div>

                {/* Front */}
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 [backface-visibility:hidden] [transform:rotateY(180deg)]",
                    matched
                      ? cn(
                          "bg-linear-to-br",
                          theme.matchWash,
                          theme.matchGlow,
                        )
                      : isPlayer
                        ? "bg-linear-to-br from-sky-900/95 to-arena-deep shadow-[0_0_0_1px_rgba(125,211,252,0.45),0_5px_0_0_rgba(0,0,0,0.4)]"
                        : "bg-linear-to-br from-amber-900/90 to-arena-deep shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_5px_0_0_rgba(0,0,0,0.4)]",
                  )}
                >
                  {matched && (
                    <motion.span
                      aria-hidden
                      initial={{ opacity: 0.85, scale: 0.55 }}
                      animate={{ opacity: 0, scale: 1.7 }}
                      transition={{ duration: 0.55 }}
                      className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-300/35"
                    />
                  )}

                  {/* Face type chip */}
                  <span
                    className={cn(
                      "absolute start-1 top-1 rounded px-1 py-px font-display text-[8px] font-black uppercase tracking-wide",
                      isPlayer
                        ? "bg-sky-400/25 text-sky-100"
                        : "bg-amber-400/25 text-amber-100",
                    )}
                  >
                    {isPlayer ? "P" : "C"}
                  </span>

                  {matched ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/icons/done.png"
                      alt=""
                      draggable={false}
                      className="absolute end-1 top-1 h-3.5 w-3.5 object-contain opacity-90"
                    />
                  ) : null}

                  {isPlayer && card.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.art}
                      alt=""
                      className="h-10 w-10 object-contain drop-shadow-md"
                    />
                  ) : !isPlayer && card.art ? (
                    <span
                      className="text-[1.75rem] leading-none drop-shadow"
                      aria-hidden
                    >
                      {card.art}
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/icons/mystery.png"
                      alt=""
                      draggable={false}
                      className="h-8 w-8 object-contain opacity-70"
                    />
                  )}
                  <span className="line-clamp-2 max-w-full px-0.5 text-center font-display text-[10px] font-extrabold leading-tight text-white">
                    {cardLabel(card)}
                  </span>
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Floating callouts */}
      <div className="pointer-events-none absolute inset-x-0 top-[44%] z-30 flex justify-center">
        <AnimatePresence mode="popLayout">
          {feedback && (
            <motion.div
              key={feedback.key}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 18, scale: 0.7 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className={cn(
                "rounded-2xl px-4 py-2 font-display text-lg font-black shadow-[0_4px_0_0_rgba(0,0,0,0.35)]",
                feedback.kind === "combo"
                  ? "bg-accent text-accent-foreground"
                  : feedback.kind === "clear"
                    ? "bg-arena-success text-white"
                    : "bg-white text-emerald-900",
              )}
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
      <div className="relative z-10 mt-auto border-t border-white/10 bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <GameCta
          variant={theme.cta}
          block
          disabled={pending || submitted.current}
          onClick={() => finish(false)}
          className="min-h-13 text-base"
        >
          {pending ? "…" : t("duel.memory.submitEarly")}
        </GameCta>
        <p className="mt-1.5 text-center font-display text-[10px] font-bold text-white/45">
          {t("duel.memory.submitHint")}
        </p>
      </div>
    </section>
  );
}
