"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { guessDuelStarPath } from "@/actions/duel/guessStarPath";
import { guessDuelMystery } from "@/actions/duel/guessMystery";
import { guessDuelGrid } from "@/actions/duel/guessGrid";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import {
  parseStarPathBoard,
  parseStarPathHalfLog,
  type StarPathHalfLog,
} from "@/lib/duel/starPathTypes";
import {
  parseMysteryBoard,
  parseMysteryHalfLog,
  type MysteryHalfLog,
} from "@/lib/duel/mysteryTypes";
import {
  parseGridBoard,
  parseGridHalfLog,
  type GridHalfLog,
} from "@/lib/duel/gridTypes";
import { searchMysteryPlayers } from "@/actions/mystery/searchPlayers";
import type {
  AttributeVerdict,
  CompareVerdict,
  MysteryGuessRecord,
  MysteryPlayerOption,
} from "@/lib/mystery/types";
import { STAR_PATH_SCORE_BY_CLUES } from "@/lib/starpath/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { GRID_SIZE, cellKey } from "@/lib/grid/types";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

type Props = {
  duelId: string;
  duel: DuelSnapshot;
  mode: "attack" | "defend";
  onDone: (duel: DuelSnapshot, missions?: EvaluateMissionsResult) => void;
};

type Flash =
  | { kind: "goal"; key: number; label: string }
  | { kind: "miss"; key: number; label: string }
  | null;

type AttackTheme = {
  flood: string;
  badge: string;
  ring: string;
  ringTrack: string;
  score: string;
  accent: string;
  cta: string;
  dockRing: string;
};

function useAttackTheme(isAttack: boolean): AttackTheme {
  return useMemo(
    () =>
      isAttack
        ? {
            flood: "from-orange-500/35 via-amber-400/10",
            badge: "bg-orange-500 text-white shadow-orange-500/40",
            ring: "stroke-orange-400",
            ringTrack: "stroke-orange-400/20",
            score: "text-orange-300",
            accent: "text-orange-300",
            cta: "game-cta-accent",
            dockRing: "focus:ring-orange-400/50",
          }
        : {
            flood: "from-sky-400/30 via-teal-400/10",
            badge: "bg-sky-500 text-white shadow-sky-500/40",
            ring: "stroke-sky-400",
            ringTrack: "stroke-sky-400/20",
            score: "text-sky-300",
            accent: "text-sky-300",
            cta: "game-cta-primary",
            dockRing: "focus:ring-sky-400/50",
          },
    [isAttack],
  );
}

/**
 * Polished duel half for STAR_PATH / MYSTERY / GRID — MemoryBoard-tier arena.
 */
export function DuelSpecialPlay({ duelId, duel, mode, onDone }: Props) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<MysteryPlayerOption[]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [localDuel, setLocalDuel] = useState(duel);
  const [flash, setFlash] = useState<Flash>(null);
  const [flashKey, setFlashKey] = useState(0);

  const isAttack = mode === "attack";
  const theme = useAttackTheme(isAttack);

  useEffect(() => {
    setLocalDuel(duel);
  }, [duel]);

  const round = useMemo(() => {
    if (localDuel.turn.roundNumber == null) return null;
    return (
      localDuel.rounds.find(
        (r) => r.roundNumber === localDuel.turn.roundNumber,
      ) ?? null
    );
  }, [localDuel]);

  const answersRaw = isAttack ? round?.attackAnswers : round?.defenseAnswers;

  async function runSearch(q: string) {
    setQuery(q);
    setSelectedId(null);
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    const res = await searchMysteryPlayers(q);
    if (res.ok) setOptions(res.players);
  }

  function pulse(kind: "goal" | "miss", label: string) {
    setFlashKey((k) => {
      const next = k + 1;
      setFlash({ kind, key: next, label });
      return next;
    });
    window.setTimeout(() => setFlash(null), 900);
  }

  const selectedLabel = useMemo(() => {
    const o = options.find((x) => x.id === selectedId);
    if (!o) return null;
    return locale === "fa" ? o.nameFa : o.nameEn;
  }, [options, selectedId, locale]);

  if (!round) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <motion.span
          className="text-4xl"
          animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          ⚽️
        </motion.span>
      </div>
    );
  }

  const badge =
    mode === "attack"
      ? t("duel.special.attackBadge")
      : t("duel.special.defendBadge");

  // ─── STAR PATH ───────────────────────────────────────────────────────────
  if (round.roundType === "STAR_PATH") {
    const board = parseStarPathBoard(round.boardJson);
    const log: StarPathHalfLog =
      parseStarPathHalfLog(answersRaw) ?? {
        guesses: [],
        cluesRevealed: 1,
        status: "IN_PROGRESS",
        score: 0,
      };
    const maxClues = board?.maxClues ?? 4;
    const nextScore = STAR_PATH_SCORE_BY_CLUES[log.cluesRevealed] ?? 25;
    const path = board?.path ?? [];
    const hudScore = log.status === "SOLVED" ? log.score : nextScore;

    return (
      <SpecialArena
        theme={theme}
        badge={badge}
        title={t("duel.special.starPathTitle")}
        subtitle={t("duel.special.starPathSub", {
          n: toLocaleDigits(log.cluesRevealed, locale),
        })}
        hudValue={hudScore}
        hudMax={100}
        hudHint={t("duel.special.scoreHint")}
        flash={flash}
        reduceMotion={Boolean(reduceMotion)}
        dock={
          <PlayerDock
            theme={theme}
            query={query}
            options={options}
            selectedId={selectedId}
            selectedLabel={selectedLabel}
            pending={pending || log.status !== "IN_PROGRESS"}
            pickHint={t("duel.special.pickHint")}
            submitLabel={t("duel.special.submitGuess")}
            onQuery={runSearch}
            onSelect={(id) => {
              setSelectedId(id);
              playSound("click");
              haptic(HAPTIC.tap);
            }}
            onSubmit={() => {
              if (!selectedId || pending) return;
              startTransition(async () => {
                const res = await guessDuelStarPath(duelId, selectedId);
                if (!res.ok) {
                  toast.error(t("duel.errGeneric"));
                  return;
                }
                setLocalDuel(res.duel);
                setQuery("");
                setSelectedId(null);
                setOptions([]);
                if (res.log.status === "SOLVED") {
                  playSound("goal");
                  haptic(HAPTIC.goal);
                  pulse("goal", t("duel.special.flashSolved"));
                } else if (res.log.status === "FAILED") {
                  playSound("miss");
                  haptic(HAPTIC.miss);
                  pulse("miss", t("duel.special.flashFailed"));
                } else {
                  playSound("miss");
                  haptic(HAPTIC.miss);
                  pulse("miss", t("duel.special.flashWrong"));
                }
                if (res.finished) {
                  window.setTimeout(
                    () => onDone(res.duel, res.missions),
                    650,
                  );
                }
              });
            }}
          />
        }
      >
        {/* Path timeline */}
        <ol className="relative mx-auto w-full max-w-sm space-y-0 px-1">
          <div
            aria-hidden
            className="absolute start-[1.35rem] top-3 bottom-3 w-0.5 bg-linear-to-b from-amber-400/80 via-amber-400/25 to-white/10"
          />
          {path.map((step, i) => {
            const revealed = i < log.cluesRevealed;
            const current = i === log.cluesRevealed - 1 && log.status === "IN_PROGRESS";
            const locked = !revealed;
            return (
              <motion.li
                key={`${step.name}-${i}`}
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="relative flex items-stretch gap-3 py-1.5"
              >
                <span
                  className={[
                    "relative z-10 mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-black ring-2",
                    revealed
                      ? current
                        ? "bg-amber-400 text-amber-950 ring-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.55)]"
                        : "bg-emerald-500 text-white ring-emerald-300/50"
                      : "bg-white/10 text-white/35 ring-white/15",
                  ].join(" ")}
                >
                  {locked ? "?" : toLocaleDigits(i + 1, locale)}
                </span>
                <div
                  className={[
                    "min-h-[3.25rem] flex-1 rounded-2xl border px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]",
                    revealed
                      ? current
                        ? "border-amber-300/60 bg-linear-to-br from-amber-400/25 to-orange-500/15"
                        : "border-white/15 bg-white/10"
                      : "border-dashed border-white/10 bg-white/[0.03]",
                  ].join(" ")}
                >
                  <p
                    className={[
                      "font-display text-base font-black",
                      revealed ? "text-white" : "text-white/25",
                    ].join(" ")}
                  >
                    {revealed ? step.name : t("duel.special.clueLocked")}
                  </p>
                  {current && (
                    <p className="mt-0.5 font-body text-[11px] font-bold text-amber-200/90">
                      {t("duel.special.nextScore", {
                        n: toLocaleDigits(nextScore, locale),
                      })}
                    </p>
                  )}
                </div>
              </motion.li>
            );
          })}
          {/* Placeholder slots if path shorter than max */}
          {Array.from({ length: Math.max(0, maxClues - path.length) }).map(
            (_, i) => (
              <li
                key={`pad-${i}`}
                className="relative flex items-center gap-3 py-1.5 opacity-40"
              >
                <span className="h-7 w-7 rounded-full bg-white/10" />
                <div className="h-12 flex-1 rounded-2xl border border-dashed border-white/10" />
              </li>
            ),
          )}
        </ol>

        {log.guesses.length > 0 && (
          <div className="mx-auto mt-4 w-full max-w-sm space-y-1.5 px-1">
            <p className="px-1 font-display text-[10px] font-extrabold uppercase tracking-wider text-white/40">
              {t("duel.special.guessLog")}
            </p>
            {log.guesses.map((g) => (
              <div
                key={`${g.playerId}-${g.at}`}
                className={[
                  "rounded-xl px-3 py-2 font-display text-sm font-bold",
                  g.correct
                    ? "bg-emerald-500/25 text-emerald-100"
                    : "bg-white/8 text-white/70",
                ].join(" ")}
              >
                {g.playerId}
                {g.correct ? " ✓" : ""}
              </div>
            ))}
          </div>
        )}
      </SpecialArena>
    );
  }

  // ─── MYSTERY ─────────────────────────────────────────────────────────────
  if (round.roundType === "MYSTERY") {
    const board = parseMysteryBoard(round.boardJson);
    const log: MysteryHalfLog =
      parseMysteryHalfLog(answersRaw) ?? {
        guesses: [],
        status: "IN_PROGRESS",
        score: 0,
      };
    const max = board?.maxGuesses ?? 6;
    const used = log.guesses.length;
    const remaining = Math.max(0, max - used);

    return (
      <SpecialArena
        theme={theme}
        badge={badge}
        title={t("duel.special.mysteryTitle")}
        subtitle={t("duel.special.mysterySub", {
          n: toLocaleDigits(used, locale),
          max: toLocaleDigits(max, locale),
        })}
        hudValue={remaining}
        hudMax={max}
        hudHint={t("duel.special.guessesLeft")}
        flash={flash}
        reduceMotion={Boolean(reduceMotion)}
        dock={
          <PlayerDock
            theme={theme}
            query={query}
            options={options}
            selectedId={selectedId}
            selectedLabel={selectedLabel}
            pending={pending || log.status !== "IN_PROGRESS"}
            pickHint={t("duel.special.pickHint")}
            submitLabel={t("duel.special.submitGuess")}
            onQuery={runSearch}
            onSelect={(id) => {
              setSelectedId(id);
              playSound("click");
              haptic(HAPTIC.tap);
            }}
            onSubmit={() => {
              if (!selectedId || pending) return;
              startTransition(async () => {
                const res = await guessDuelMystery(duelId, selectedId);
                if (!res.ok) {
                  toast.error(t("duel.errGeneric"));
                  return;
                }
                setLocalDuel(res.duel);
                setQuery("");
                setSelectedId(null);
                setOptions([]);
                if (res.log.status === "SOLVED") {
                  playSound("goal");
                  haptic(HAPTIC.goal);
                  pulse("goal", t("duel.special.flashSolved"));
                } else if (res.log.status === "FAILED") {
                  playSound("miss");
                  haptic(HAPTIC.miss);
                  pulse("miss", t("duel.special.flashFailed"));
                } else {
                  playSound("miss");
                  haptic(HAPTIC.miss);
                }
                if (res.finished) {
                  window.setTimeout(
                    () => onDone(res.duel, res.missions),
                    650,
                  );
                }
              });
            }}
          />
        }
      >
        {/* Attempt dots */}
        <div className="mb-3 flex items-center justify-center gap-2">
          {Array.from({ length: max }).map((_, i) => {
            const g = log.guesses[i];
            const next = i === used && log.status === "IN_PROGRESS";
            let tone = "h-2.5 w-2.5 bg-white/20";
            if (g?.isCorrect)
              tone =
                "h-3 w-3 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]";
            else if (g)
              tone =
                "h-2.5 w-2.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
            else if (next) tone = "h-3 w-3 bg-white ring-2 ring-white/35";
            return (
              <motion.span
                key={i}
                animate={
                  next && !reduceMotion ? { scale: [1, 1.2, 1] } : undefined
                }
                transition={
                  next
                    ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
                className={["rounded-full", tone].join(" ")}
              />
            );
          })}
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
          <div className="grid grid-cols-3 gap-1.5 px-0.5">
            {[
              t("mystery.colNation"),
              t("mystery.colPos"),
              t("mystery.colLeague"),
              t("mystery.colClub"),
              t("mystery.colAge"),
              t("mystery.colShirt"),
            ].map((label) => (
              <span
                key={label}
                className="text-center font-display text-[9px] font-extrabold uppercase tracking-wider text-white/35"
              >
                {label}
              </span>
            ))}
          </div>

          {Array.from({ length: max }).map((_, i) => {
            const guess = log.guesses[i];
            if (guess) {
              return <MysteryGuessRow key={`${guess.playerId}-${guess.at}`} guess={guess} />;
            }
            return (
              <div
                key={`empty-${i}`}
                className={[
                  "grid grid-cols-3 gap-1.5 rounded-2xl p-1.5",
                  i === used
                    ? "bg-white/10 ring-1 ring-white/25"
                    : "bg-white/[0.03]",
                ].join(" ")}
              >
                {Array.from({ length: 6 }).map((__, j) => (
                  <div
                    key={j}
                    className="flex min-h-11 items-center justify-center rounded-xl bg-white/5 font-display text-xs font-bold text-white/15"
                  >
                    ·
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </SpecialArena>
    );
  }

  // ─── GRID ────────────────────────────────────────────────────────────────
  if (round.roundType === "GRID") {
    const board = parseGridBoard(round.boardJson);
    const log: GridHalfLog =
      parseGridHalfLog(answersRaw) ?? {
        cells: {},
        wrongGuesses: [],
        status: "IN_PROGRESS",
        score: 0,
      };
    const maxMistakes = board?.maxMistakes ?? 9;
    const mistakesLeft = Math.max(0, maxMistakes - log.wrongGuesses.length);

    return (
      <SpecialArena
        theme={theme}
        badge={badge}
        title={t("duel.special.gridTitle")}
        subtitle={t("duel.special.gridSub", {
          n: toLocaleDigits(log.score, locale),
          mistakes: toLocaleDigits(log.wrongGuesses.length, locale),
        })}
        hudValue={log.score}
        hudMax={9}
        hudHint={t("duel.special.cellsHint")}
        flash={flash}
        reduceMotion={Boolean(reduceMotion)}
        dock={
          selectedCell ? (
            <PlayerDock
              theme={theme}
              query={query}
              options={options}
              selectedId={selectedId}
              selectedLabel={selectedLabel}
              pending={pending || log.status !== "IN_PROGRESS"}
              pickHint={t("duel.special.gridPickHint")}
              submitLabel={t("duel.special.submitCell")}
              onQuery={runSearch}
              onSelect={(id) => {
                setSelectedId(id);
                playSound("click");
                haptic(HAPTIC.tap);
              }}
              onSubmit={() => {
                if (!selectedId || !selectedCell || pending) return;
                const cell = selectedCell;
                startTransition(async () => {
                  const res = await guessDuelGrid({
                    duelId,
                    playerId: selectedId,
                    row: cell.row,
                    col: cell.col,
                  });
                  if (!res.ok) {
                    toast.error(t("duel.errGeneric"));
                    return;
                  }
                  const prevScore = log.score;
                  setLocalDuel(res.duel);
                  setQuery("");
                  setSelectedId(null);
                  setOptions([]);
                  setSelectedCell(null);
                  if (res.log.score > prevScore) {
                    playSound("goal");
                    haptic(HAPTIC.goal);
                    pulse("goal", t("duel.special.flashCell"));
                  } else {
                    playSound("miss");
                    haptic(HAPTIC.miss);
                    pulse("miss", t("duel.special.flashWrong"));
                  }
                  if (res.finished) {
                    window.setTimeout(
                      () => onDone(res.duel, res.missions),
                      650,
                    );
                  }
                });
              }}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-center">
              <p className="font-display text-sm font-bold text-white/70">
                {t("duel.special.gridTapCell")}
              </p>
              <p className="mt-1 font-body text-xs font-semibold text-white/40">
                {t("duel.special.mistakesLeft", {
                  n: toLocaleDigits(mistakesLeft, locale),
                })}
              </p>
            </div>
          )
        }
      >
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-white/12 bg-black/30 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `minmax(3.5rem,auto) repeat(${GRID_SIZE}, minmax(0,1fr))`,
            }}
          >
            <div />
            {(board?.cols ?? []).map((c) => (
              <div
                key={c.id}
                className="flex min-h-12 items-center justify-center rounded-xl bg-white/10 px-1 text-center font-display text-[10px] font-extrabold leading-tight text-white/85"
              >
                {locale === "fa" ? c.labelFa : c.labelEn}
              </div>
            ))}
            {(board?.rows ?? []).map((r, ri) => (
              <div key={r.id} className="contents">
                <div className="flex min-h-[4.25rem] items-center rounded-xl bg-white/10 px-1.5 font-display text-[10px] font-extrabold leading-tight text-white/85">
                  {locale === "fa" ? r.labelFa : r.labelEn}
                </div>
                {Array.from({ length: GRID_SIZE }, (_, ci) => {
                  const key = cellKey(ri, ci);
                  const filled = log.cells[key];
                  const selected =
                    selectedCell?.row === ri && selectedCell?.col === ci;
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      disabled={pending || Boolean(filled) || log.status !== "IN_PROGRESS"}
                      whileTap={filled ? undefined : { scale: 0.96 }}
                      onClick={() => {
                        setSelectedCell({ row: ri, col: ci });
                        setSelectedId(null);
                        setQuery("");
                        setOptions([]);
                        playSound("click");
                        haptic(HAPTIC.tap);
                      }}
                      className={[
                        "relative flex min-h-[4.25rem] flex-col items-center justify-center rounded-2xl border-2 px-1 py-1.5 text-center transition-colors",
                        filled
                          ? "border-emerald-400/55 bg-linear-to-br from-emerald-500/35 to-teal-600/30 text-white shadow-[0_0_18px_rgba(52,211,153,0.25)]"
                          : selected
                            ? "border-amber-300 bg-amber-400/25 text-white ring-2 ring-amber-300/40"
                            : "border-white/12 bg-white/[0.04] text-white/50 hover:bg-white/10",
                      ].join(" ")}
                    >
                      {filled ? (
                        <span className="font-display text-[11px] font-black leading-snug">
                          {locale === "fa" ? filled.nameFa : filled.nameEn}
                        </span>
                      ) : (
                        <span className="font-display text-2xl font-black text-white/30">
                          ＋
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Lives */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: maxMistakes }).map((_, i) => {
            const spent = i < log.wrongGuesses.length;
            return (
              <span
                key={i}
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  spent ? "bg-rose-500/80" : "bg-emerald-400/80",
                ].join(" ")}
              />
            );
          })}
        </div>
      </SpecialArena>
    );
  }

  return null;
}

// ─── Shared chrome ───────────────────────────────────────────────────────────

function SpecialArena({
  theme,
  badge,
  title,
  subtitle,
  hudValue,
  hudMax,
  hudHint,
  flash,
  reduceMotion,
  dock,
  children,
}: {
  theme: AttackTheme;
  badge: string;
  title: string;
  subtitle: string;
  hudValue: number;
  hudMax: number;
  hudHint: string;
  flash: Flash;
  reduceMotion: boolean;
  dock: React.ReactNode;
  children: React.ReactNode;
}) {
  const { locale } = useTranslation();
  const ringR = 30;
  const ringC = 2 * Math.PI * ringR;
  const pct = Math.min(1, hudValue / Math.max(1, hudMax));
  const ringOffset = ringC * (1 - pct);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#071410]" />
        <div
          className={`absolute inset-x-0 top-0 h-48 bg-linear-to-b ${theme.flood} to-transparent`}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 28px, rgba(255,255,255,0.09) 28px 29px), repeating-linear-gradient(0deg, transparent 0 36px, rgba(255,255,255,0.05) 36px 37px)",
          }}
        />
        <div className="absolute inset-x-[12%] top-[38%] h-px bg-white/12" />
        <div className="absolute start-1/2 top-[28%] h-[44%] w-px -translate-x-1/2 bg-white/10" />
        <div className="absolute start-1/2 top-[48%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/55 to-transparent" />
      </div>

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
              {toLocaleDigits(hudValue, locale)}
            </span>
            <span className="font-display text-[10px] font-bold text-white/45">
              /{toLocaleDigits(hudMax, locale)}
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
            {badge}
          </span>
          <h2 className="mt-1.5 font-display text-xl font-black text-white drop-shadow-md">
            {title}
          </h2>
          <p className="mt-0.5 font-body text-xs font-semibold text-white/55">
            {subtitle}
          </p>
          <p className={`mt-0.5 font-display text-[11px] font-bold ${theme.accent}`}>
            {hudHint}
          </p>
        </div>
      </header>

      <div className="relative z-10 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
        {children}
      </div>

      <div className="relative z-20 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {dock}
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.key}
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="pointer-events-none absolute inset-x-0 top-[28%] z-30 flex justify-center"
          >
            <span
              className={[
                "rounded-2xl px-5 py-2.5 font-display text-lg font-black shadow-2xl",
                flash.kind === "goal"
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-rose-500 text-white",
              ].join(" ")}
            >
              {flash.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PlayerDock({
  theme,
  query,
  options,
  selectedId,
  selectedLabel,
  pending,
  pickHint,
  submitLabel,
  onQuery,
  onSelect,
  onSubmit,
}: {
  theme: AttackTheme;
  query: string;
  options: MysteryPlayerOption[];
  selectedId: string | null;
  selectedLabel: string | null;
  pending: boolean;
  pickHint: string;
  submitLabel: string;
  onQuery: (q: string) => void;
  onSelect: (id: string) => void;
  onSubmit: () => void;
}) {
  const { t, locale } = useTranslation();
  return (
    <div className="rounded-bubble-lg border border-white/10 bg-[#0c1016]/95 px-2.5 pb-2.5 pt-2 shadow-[0_-12px_32px_rgba(0,0,0,0.55)] backdrop-blur-md">
      <p className="mb-1.5 text-center font-display text-[11px] font-bold text-white/55">
        {selectedLabel ? `✓ ${selectedLabel}` : pickHint}
      </p>
      <input
        type="search"
        value={query}
        disabled={pending}
        onChange={(e) => void onQuery(e.target.value)}
        placeholder={t("mystery.searchPlaceholder")}
        className={[
          "min-h-12 w-full rounded-2xl bg-white/8 px-3 font-display text-sm font-bold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:ring-2",
          theme.dockRing,
        ].join(" ")}
      />
      <ul className="mt-1.5 max-h-32 overflow-y-auto rounded-2xl bg-black/30 ring-1 ring-white/10">
        {options.length === 0 ? (
          <li className="px-3 py-2.5 text-center font-display text-xs font-bold text-white/35">
            {query.trim().length < 2 ? t("duel.special.typeMore") : "…"}
          </li>
        ) : (
          options.map((o) => {
            const active = selectedId === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onSelect(o.id)}
                  className={[
                    "flex w-full min-h-12 items-center justify-between gap-2 px-3 py-2 text-start font-display text-sm font-bold",
                    active
                      ? "bg-amber-400/20 text-amber-100"
                      : "text-white/90 hover:bg-white/8",
                  ].join(" ")}
                >
                  <span className="truncate">
                    {locale === "fa" ? o.nameFa : o.nameEn}
                  </span>
                  <span className="shrink-0 text-[10px] font-extrabold text-white/40">
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
        disabled={pending || !selectedId}
        onClick={onSubmit}
        className={[
          "game-cta mt-2 flex min-h-touch w-full items-center justify-center disabled:opacity-40",
          theme.cta,
        ].join(" ")}
      >
        {pending ? "…" : submitLabel}
      </button>
    </div>
  );
}

function verdictStyle(v: AttributeVerdict | CompareVerdict): string {
  if (v === "correct")
    return "bg-emerald-500 text-white ring-1 ring-emerald-300/40";
  if (v === "close")
    return "bg-amber-500 text-white ring-1 ring-amber-200/40";
  if (v === "higher" || v === "lower")
    return "bg-sky-500 text-white ring-1 ring-sky-300/40";
  return "bg-rose-600 text-white ring-1 ring-rose-300/35";
}

function verdictGlyph(v: AttributeVerdict | CompareVerdict): string {
  if (v === "correct") return "✓";
  if (v === "close") return "~";
  if (v === "higher") return "▲";
  if (v === "lower") return "▼";
  return "✕";
}

function MysteryGuessRow({ guess }: { guess: MysteryGuessRecord }) {
  const { locale } = useTranslation();
  const name = locale === "fa" ? guess.nameFa : guess.nameEn;
  const cells: { key: string; v: AttributeVerdict | CompareVerdict; label: string }[] =
    [
      {
        key: "n",
        v: guess.nationality,
        label: guess.nationalityValue ?? "—",
      },
      {
        key: "p",
        v: guess.position,
        label: guess.positionValue ?? "—",
      },
      {
        key: "l",
        v: guess.league,
        label: guess.leagueValue ?? "—",
      },
      {
        key: "c",
        v: guess.club,
        label: guess.clubValue ?? "—",
      },
      {
        key: "a",
        v: guess.age,
        label:
          guess.ageValue != null ? String(guess.ageValue) : "—",
      },
      {
        key: "s",
        v: guess.shirtNumber,
        label:
          guess.shirtNumberValue != null
            ? String(guess.shirtNumberValue)
            : "—",
      },
    ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/8 p-1.5 ring-1 ring-white/10"
    >
      <p className="mb-1.5 truncate px-1 font-display text-xs font-extrabold text-white/70">
        {name}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {cells.map((c) => (
          <div
            key={c.key}
            className={[
              "flex min-h-11 flex-col items-center justify-center rounded-xl px-1 shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)]",
              verdictStyle(c.v),
            ].join(" ")}
          >
            <span className="font-display text-[10px] font-black leading-none">
              {verdictGlyph(c.v)}
            </span>
            <span className="mt-0.5 max-w-full truncate font-display text-[10px] font-extrabold">
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
