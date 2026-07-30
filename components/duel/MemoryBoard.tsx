"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

/**
 * Async MEMORY half — 4×4 footballer ↔ country. Server grades matches;
 * client auto-submits on timer end with partial pairs.
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
  const startedAt = useRef(performance.now());
  const submitted = useRef(false);

  const [states, setStates] = useState<CardState[]>(() =>
    board.cards.map(() => "down"),
  );
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [pairsFound, setPairsFound] = useState(0);
  const [flips, setFlips] = useState<MemoryAttemptSubmission["flips"]>([]);
  const [matches, setMatches] = useState<MemoryAttemptSubmission["matches"]>(
    [],
  );
  const flipsRef = useRef(flips);
  const matchesRef = useRef(matches);
  flipsRef.current = flips;
  matchesRef.current = matches;

  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)),
  );
  const [burst, setBurst] = useState(false);

  const isAttack = mode === "attack";
  const accent = isAttack
    ? {
        glow: "from-orange-500/30",
        badge: "bg-orange-500/20 text-orange-200 ring-orange-400/40",
        bar: "bg-orange-400",
        score: "text-orange-300",
      }
    : {
        glow: "from-sky-500/30",
        badge: "bg-sky-500/20 text-sky-200 ring-sky-400/40",
        bar: "bg-sky-400",
        score: "text-sky-300",
      };

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
      finish(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submit once on clear
  }, [pairsFound, board.pairCount]);

  function cardLabel(card: MemoryCard): string {
    return lang === "fa" ? card.labelFa : card.labelEn;
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
        setBurst(true);
        window.setTimeout(() => setBurst(false), 500);
        playSound("goal");
        haptic(HAPTIC.goal);
      } else {
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

  const barPct = Math.min(100, (secondsLeft / 20) * 100);

  return (
    <section className="relative flex flex-1 flex-col gap-3 px-3 pb-4 pt-2">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent.glow} via-transparent to-emerald-950/40`}
      />

      <header className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${accent.badge}`}
          >
            {mode === "attack"
              ? t("duel.memory.attackBadge")
              : t("duel.memory.defendBadge")}
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {t("duel.memory.title")}
          </h2>
          <p className="mt-0.5 text-sm text-white/60">
            {t("duel.memory.hint")}
          </p>
        </div>
        <div className="text-end">
          <p className={`text-2xl font-black tabular-nums ${accent.score}`}>
            {toLocaleDigits(pairsFound, locale)}
            <span className="text-base text-white/40">
              /{toLocaleDigits(board.pairCount, locale)}
            </span>
          </p>
          <p className="text-xs font-semibold text-white/50">
            {t("duel.memory.pairs")}
          </p>
        </div>
      </header>

      <div className="relative z-10 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-1.5 ${accent.bar}`}
          animate={{ width: `${barPct}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
      <p className="relative z-10 text-center text-sm font-bold tabular-nums text-white/80">
        {t("duel.memory.timer", {
          s: toLocaleDigits(secondsLeft, locale),
        })}
      </p>

      <div
        className="relative z-10 mx-auto grid w-full max-w-md grid-cols-4 gap-2"
        role="grid"
        aria-label={t("duel.memory.title")}
      >
        {board.cards.map((card, index) => {
          const state = states[index]!;
          const faceUp = state === "up" || state === "matched";
          return (
            <button
              key={card.id}
              type="button"
              disabled={pending || locked || state !== "down" || submitted.current}
              onClick={() => handleFlip(card, index)}
              className="relative aspect-square min-h-[44px] min-w-[44px] [perspective:800px]"
              aria-label={faceUp ? cardLabel(card) : t("duel.memory.cardBack")}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                {/* Back */}
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-800 via-slate-900 to-black ring-1 ring-white/15 [backface-visibility:hidden] shadow-lg">
                  <span className="text-lg opacity-80">⚽</span>
                </div>
                {/* Front */}
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 ring-1 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    state === "matched"
                      ? "bg-emerald-500/30 ring-emerald-300/50"
                      : "bg-slate-900/95 ring-white/20"
                  }`}
                >
                  {card.face === "PLAYER" && card.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.art}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  ) : card.face === "COUNTRY" && card.art ? (
                    <span className="text-2xl leading-none" aria-hidden>
                      {card.art}
                    </span>
                  ) : (
                    <span className="text-lg">❓</span>
                  )}
                  <span className="line-clamp-2 text-center text-[10px] font-bold leading-tight text-white/90">
                    {cardLabel(card)}
                  </span>
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {burst && (
          <motion.p
            key="burst"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-20 text-center text-lg font-black text-emerald-300"
          >
            {t("duel.memory.pairFound")}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="button"
        disabled={pending || submitted.current}
        onClick={() => finish(false)}
        className="relative z-10 mx-auto mt-auto min-h-touch rounded-2xl bg-white/10 px-8 text-sm font-bold text-white ring-1 ring-white/20"
      >
        {pending ? "…" : t("duel.memory.submitEarly")}
      </button>
    </section>
  );
}
