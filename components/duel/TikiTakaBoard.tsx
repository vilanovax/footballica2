"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { beginTikiTakaTurn } from "@/actions/duel/tikitaka/beginTikiTakaTurn";
import { submitTikiTakaGuess } from "@/actions/duel/tikitaka/submitTikiTakaGuess";
import { searchMysteryPlayers } from "@/actions/mystery/searchPlayers";
import type { MysteryPlayerOption } from "@/lib/mystery/types";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import {
  countOwnedCells,
  parseTikiTakaBoard,
  type TikiTakaBoardJson,
} from "@/lib/duel/tikiTakaTypes";
import { GRID_SIZE, cellKey } from "@/lib/grid/types";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { DuelSpecialHelpSheet } from "@/components/duel/DuelSpecialHelpSheet";

type TikiTakaBoardProps = {
  duelId: string;
  duel: DuelSnapshot;
  pending?: boolean;
  onDone: (duel: DuelSnapshot, missions?: EvaluateMissionsResult) => void;
  onBoardChange?: (duel: DuelSnapshot, board: TikiTakaBoardJson) => void;
};

type Flash =
  | { kind: "goal" | "miss" | "win" | "steal"; label: string; key: number }
  | null;

/**
 * Shared PvP 3×3 Tiki-Taka board — Dark Arena language.
 * Blue = you, Red = rival, empty = stealable.
 */
export function TikiTakaBoard({
  duelId,
  duel,
  pending: parentPending,
  onDone,
  onBoardChange,
}: TikiTakaBoardProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [localDuel, setLocalDuel] = useState(duel);
  const [pending, startTransition] = useTransition();
  const busy = Boolean(pending || parentPending);

  const round = useMemo(() => {
    const n = localDuel.turn.roundNumber;
    if (n == null) return null;
    return localDuel.rounds.find((r) => r.roundNumber === n) ?? null;
  }, [localDuel]);

  const board = useMemo(
    () => parseTikiTakaBoard(round?.boardJson) ?? null,
    [round?.boardJson],
  );

  const youId =
    localDuel.youAre === "challenger"
      ? localDuel.challenger?.id ?? null
      : localDuel.opponent?.id ?? null;
  const themId =
    localDuel.youAre === "challenger"
      ? localDuel.opponent?.id ?? null
      : localDuel.challenger?.id ?? null;

  // turnOwnerId is authoritative; WAITING_* has canAct=false until begin claims.
  const yourTurn = Boolean(
    board &&
      youId &&
      board.turnOwnerId === youId &&
      board.status === "IN_PROGRESS",
  );

  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const beginInFlight = useRef(false);
  const timeoutSent = useRef(false);
  const flashKey = useRef(0);

  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<MysteryPlayerOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Bootstrap 20s clock when it's your mini-turn.
  useEffect(() => {
    if (!yourTurn || !board || endsAt) return;
    if (beginInFlight.current) return;
    beginInFlight.current = true;
    let cancelled = false;
    startTransition(async () => {
      const res = await beginTikiTakaTurn(duelId);
      if (cancelled) {
        beginInFlight.current = false;
        return;
      }
      if (!res.ok) {
        beginInFlight.current = false;
        return;
      }
      setLocalDuel(res.duel);
      setEndsAt(res.endsAt);
      onBoardChange?.(res.duel, res.board);
      beginInFlight.current = false;
      timeoutSent.current = false;
      playSound("whistle");
    });
    return () => {
      cancelled = true;
    };
  }, [yourTurn, board, endsAt, duelId, onBoardChange]);

  useEffect(() => {
    if (!endsAt || !yourTurn) return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(left);
      if (left <= 0 && !timeoutSent.current && !busy) {
        timeoutSent.current = true;
        const cell = selectedCell ?? { row: 0, col: 0 };
        startTransition(async () => {
          const res = await submitTikiTakaGuess({
            duelId,
            row: cell.row,
            col: cell.col,
            playerId: selectedId ?? "",
            timedOut: true,
          });
          if (!res.ok) return;
          setLocalDuel(res.duel);
          setEndsAt(null);
          setSelectedCell(null);
          setSelectedId(null);
          setQuery("");
          setOptions([]);
          playSound("miss");
          haptic(HAPTIC.miss);
          pulse("miss", t("duel.tiki.flashTimeout"));
          if (res.finished) {
            window.setTimeout(() => onDone(res.duel, res.missions), 700);
          } else {
            onBoardChange?.(res.duel, res.board);
          }
        });
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [
    endsAt,
    yourTurn,
    busy,
    selectedCell,
    selectedId,
    duelId,
    onDone,
    onBoardChange,
    t,
  ]);

  useEffect(() => {
    setLocalDuel(duel);
  }, [duel]);

  function pulse(kind: NonNullable<Flash>["kind"], label: string) {
    flashKey.current += 1;
    setFlash({ kind, label, key: flashKey.current });
    window.setTimeout(() => setFlash(null), 900);
  }

  async function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    const res = await searchMysteryPlayers(q);
    if (res.ok) setOptions(res.players);
  }

  function submitGuess() {
    if (!selectedCell || !selectedId || busy || !yourTurn) return;
    const cell = selectedCell;
    const playerId = selectedId;
    startTransition(async () => {
      const res = await submitTikiTakaGuess({
        duelId,
        row: cell.row,
        col: cell.col,
        playerId,
      });
      if (!res.ok) {
        if (res.error === "player_used") {
          toast.error(t("duel.tiki.errUsed"));
        } else if (res.error === "cell_taken") {
          toast.error(t("duel.tiki.errTaken"));
        } else {
          toast.error(t("duel.errGeneric"));
        }
        return;
      }
      setLocalDuel(res.duel);
      setEndsAt(null);
      setSelectedCell(null);
      setSelectedId(null);
      setQuery("");
      setOptions([]);
      if (res.correct) {
        playSound("goal");
        haptic(HAPTIC.goal);
        pulse("goal", t("duel.tiki.flashClaim"));
      } else {
        playSound("miss");
        haptic(HAPTIC.miss);
        pulse("miss", t("duel.tiki.flashMiss"));
      }
      if (res.finished) {
        if (res.board.winnerId === youId) {
          pulse("win", t("duel.tiki.flashWin"));
        }
        window.setTimeout(() => onDone(res.duel, res.missions), 800);
      } else {
        onBoardChange?.(res.duel, res.board);
      }
    });
  }

  if (!board || !round) {
    return (
      <div className="flex flex-1 items-center justify-center font-display text-sm font-bold text-white/50">
        {t("duel.tiki.loading")}
      </div>
    );
  }

  const youCells = youId ? countOwnedCells(board, youId) : 0;
  const themCells = themId ? countOwnedCells(board, themId) : 0;
  const hurry = yourTurn && secondsLeft > 0 && secondsLeft <= 5;
  const winSet = new Set(board.winLine ?? []);
  const selectedLabel = (() => {
    const o = options.find((opt) => opt.id === selectedId);
    if (!o) return null;
    return locale === "fa" ? o.nameFa : o.nameEn;
  })();

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#071410]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-sky-500/30 via-emerald-500/10 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 28px, rgba(255,255,255,0.09) 28px 29px), repeating-linear-gradient(0deg, transparent 0 36px, rgba(255,255,255,0.05) 36px 37px)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/55 to-transparent" />
      </div>

      <header className="relative z-10 flex items-center gap-3 px-3 pt-3">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={30}
              fill="none"
              strokeWidth="6"
              className="stroke-white/15"
            />
            <motion.circle
              cx="40"
              cy="40"
              r={30}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={hurry ? "stroke-rose-400" : "stroke-sky-400"}
              strokeDasharray={2 * Math.PI * 30}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 30 * (1 - Math.min(1, secondsLeft / 20)),
              }}
              transition={{ duration: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={[
                "font-display text-xl font-black tabular-nums leading-none",
                hurry ? "text-rose-300" : "text-sky-300",
              ].join(" ")}
            >
              {yourTurn
                ? toLocaleDigits(secondsLeft, locale)
                : toLocaleDigits(youCells, locale)}
            </span>
            <span className="font-display text-[10px] font-bold text-white/45">
              {yourTurn ? "s" : t("duel.tiki.cells")}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-extrabold uppercase tracking-wide shadow-lg",
              yourTurn
                ? "bg-sky-500 text-white shadow-sky-500/40"
                : "bg-rose-500 text-white shadow-rose-500/40",
            ].join(" ")}
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
            {yourTurn ? t("duel.tiki.yourTurn") : t("duel.tiki.theirTurn")}
          </span>
          <h2 className="mt-1.5 font-display text-xl font-black text-white drop-shadow-md">
            {t("duel.tiki.title")}
          </h2>
          <p className="mt-0.5 font-body text-xs font-semibold text-white/55">
            {t("duel.tiki.sub", {
              you: toLocaleDigits(youCells, locale),
              them: toLocaleDigits(themCells, locale),
            })}
          </p>
        </div>

        <button
          type="button"
          aria-label={t("duel.tiki.helpAria")}
          onClick={() => {
            playSound("click");
            haptic(HAPTIC.tap);
            setHelpOpen(true);
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center active:scale-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/help-gold.png"
            alt=""
            draggable={false}
            className="h-11 w-11 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
          />
        </button>
      </header>

      <div className="relative z-10 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-white/12 bg-black/30 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `minmax(3.5rem,auto) repeat(${GRID_SIZE}, minmax(0,1fr))`,
            }}
          >
            <div />
            {board.axes.cols.map((c) => (
              <div
                key={c.id}
                className="flex min-h-12 items-center justify-center rounded-xl bg-white/10 px-1 text-center font-display text-[10px] font-extrabold leading-tight text-white/85"
              >
                {locale === "fa" ? c.labelFa : c.labelEn}
              </div>
            ))}
            {board.axes.rows.map((r, ri) => (
              <div key={r.id} className="contents">
                <div className="flex min-h-[4.25rem] items-center rounded-xl bg-white/10 px-1.5 font-display text-[10px] font-extrabold leading-tight text-white/85">
                  {locale === "fa" ? r.labelFa : r.labelEn}
                </div>
                {Array.from({ length: GRID_SIZE }, (_, ci) => {
                  const key = cellKey(ri, ci);
                  const cell = board.cells[key]!;
                  const ownedByYou = youId != null && cell.ownerId === youId;
                  const ownedByThem = themId != null && cell.ownerId === themId;
                  const empty = !cell.ownerId;
                  const selected =
                    selectedCell?.row === ri && selectedCell?.col === ci;
                  const isWin = winSet.has(key);
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      disabled={busy || !yourTurn || !empty || board.status !== "IN_PROGRESS"}
                      whileTap={empty && yourTurn ? { scale: 0.96 } : undefined}
                      onClick={() => {
                        if (!yourTurn || !empty) return;
                        setSelectedCell({ row: ri, col: ci });
                        setSelectedId(null);
                        setQuery("");
                        setOptions([]);
                        playSound("click");
                        haptic(HAPTIC.tap);
                      }}
                      className={[
                        "relative flex min-h-[4.25rem] flex-col items-center justify-center rounded-2xl border-2 px-1 py-1.5 text-center transition-colors",
                        ownedByYou
                          ? "border-sky-400/70 bg-linear-to-br from-sky-500/45 to-blue-700/35 text-white shadow-[0_0_18px_rgba(56,189,248,0.35)]"
                          : ownedByThem
                            ? "border-rose-400/70 bg-linear-to-br from-rose-500/45 to-red-800/35 text-white shadow-[0_0_18px_rgba(251,113,133,0.3)]"
                            : selected
                              ? "border-amber-300 bg-amber-400/25 text-white ring-2 ring-amber-300/40"
                              : "border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:bg-white/10",
                        isWin ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-[#071410]" : "",
                      ].join(" ")}
                    >
                      {ownedByYou || ownedByThem ? (
                        <>
                          <span className="font-display text-[10px] font-extrabold uppercase tracking-wide opacity-80">
                            {ownedByYou
                              ? t("duel.tiki.you")
                              : t("duel.tiki.them")}
                          </span>
                          <span className="mt-0.5 line-clamp-2 font-display text-[11px] font-bold leading-tight">
                            {cell.playerId?.replace(/-/g, " ") ?? "•"}
                          </span>
                        </>
                      ) : (
                        <span className="font-display text-lg font-black text-white/25">
                          +
                        </span>
                      )}
                      {isWin && (
                        <motion.span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-300/20"
                          animate={
                            reduceMotion
                              ? undefined
                              : { opacity: [0.2, 0.55, 0.2] }
                          }
                          transition={{ repeat: Infinity, duration: 1.2 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-3">
          <LegendDot className="bg-sky-400" label={t("duel.tiki.you")} />
          <LegendDot className="bg-white/25" label={t("duel.tiki.open")} />
          <LegendDot className="bg-rose-400" label={t("duel.tiki.them")} />
        </div>
      </div>

      <div className="relative z-20 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {yourTurn && selectedCell ? (
          <div className="rounded-bubble-lg border border-white/10 bg-[#0c1016]/95 px-2.5 pb-2.5 pt-2 shadow-[0_-12px_32px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <p className="mb-1 text-center font-display text-[11px] font-extrabold text-sky-200/90">
              {t("duel.tiki.cellFor", {
                row:
                  locale === "fa"
                    ? board.axes.rows[selectedCell.row]!.labelFa
                    : board.axes.rows[selectedCell.row]!.labelEn,
                col:
                  locale === "fa"
                    ? board.axes.cols[selectedCell.col]!.labelFa
                    : board.axes.cols[selectedCell.col]!.labelEn,
              })}
            </p>
            <p className="mb-1.5 text-center font-display text-[11px] font-bold text-white/55">
              {selectedLabel
                ? `✓ ${selectedLabel}`
                : t("duel.tiki.pickHint")}
            </p>
            <input
              type="search"
              value={query}
              disabled={busy}
              onChange={(e) => void runSearch(e.target.value)}
              placeholder={t("mystery.searchPlaceholder")}
              className="min-h-12 w-full rounded-2xl bg-white/8 px-3 font-display text-sm font-bold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:ring-2 focus:ring-sky-400/50"
            />
            <ul className="mt-1.5 max-h-32 overflow-y-auto rounded-2xl bg-black/30 ring-1 ring-white/10">
              {options.length === 0 ? (
                <li className="px-3 py-2.5 text-center font-display text-xs font-bold text-white/35">
                  {query.trim().length < 2
                    ? t("duel.special.typeMore")
                    : "…"}
                </li>
              ) : (
                options.map((o) => {
                  const used = board.usedPlayerIds.includes(o.id);
                  const active = selectedId === o.id;
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        disabled={busy || used}
                        onClick={() => {
                          setSelectedId(o.id);
                          playSound("click");
                          haptic(HAPTIC.tap);
                        }}
                        className={[
                          "flex w-full min-h-12 items-center justify-between gap-2 px-3 py-2 text-start font-display text-sm font-bold",
                          used
                            ? "text-white/25 line-through"
                            : active
                              ? "bg-sky-500/25 text-sky-100"
                              : "text-white/85 hover:bg-white/8",
                        ].join(" ")}
                      >
                        <span>{locale === "fa" ? o.nameFa : o.nameEn}</span>
                        {used && (
                          <span className="text-[10px] uppercase">
                            {t("duel.tiki.used")}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <button
              type="button"
              disabled={busy || !selectedId}
              onClick={submitGuess}
              className="btn-fantasy-primary mt-2 w-full min-h-12"
            >
              {t("duel.tiki.submit")}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-center">
            <p className="font-display text-sm font-bold text-white/70">
              {yourTurn
                ? t("duel.tiki.tapCell")
                : t("duel.tiki.waitRival")}
            </p>
            <p className="mt-1 font-body text-xs font-semibold text-white/40">
              {t("duel.tiki.missRule")}
            </p>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setHelpOpen(true);
              }}
              className="mt-2 min-h-11 px-3 font-display text-xs font-extrabold text-sky-300 underline-offset-2 hover:underline"
            >
              {t("duel.help.howToPlay")}
            </button>
          </div>
        )}
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
                flash.kind === "goal" || flash.kind === "win"
                  ? "bg-emerald-400 text-emerald-950"
                  : flash.kind === "steal"
                    ? "bg-amber-400 text-amber-950"
                    : "bg-rose-500 text-white",
              ].join(" ")}
            >
              {flash.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <DuelSpecialHelpSheet
        mode="tikiTaka"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        tone="dark"
      />
    </section>
  );
}

function LegendDot({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-white/55">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
