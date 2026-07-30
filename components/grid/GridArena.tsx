"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { DailyGridSnapshot } from "@/actions/grid/getDailyGrid";
import { submitGridGuess } from "@/actions/grid/submitGridGuess";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import { BadgeUnlockPopup } from "@/components/quiz/BadgeUnlockPopup";
import { cellKey } from "@/lib/grid/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type Props = {
  initial: DailyGridSnapshot;
};

export function GridArena({ initial }: Props) {
  const { t, locale } = useTranslation();
  const [grid, setGrid] = useState(initial);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);

  const done = grid.status === "SOLVED" || grid.status === "FAILED";
  const usedIds = useMemo(
    () =>
      new Set(
        Object.values(grid.cells)
          .map((c) => c?.playerId)
          .filter(Boolean) as string[],
      ),
    [grid.cells],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return grid.options
      .filter((o) => !usedIds.has(o.id))
      .filter((o) => {
        if (!q) return true;
        return (
          o.nameEn.toLowerCase().includes(q) ||
          o.nameFa.includes(query.trim()) ||
          o.club.toLowerCase().includes(q)
        );
      });
  }, [grid.options, usedIds, query]);

  const selectedRowLabel = selected
    ? locale === "fa"
      ? grid.rows[selected.row]?.labelFa
      : grid.rows[selected.row]?.labelEn
    : null;
  const selectedColLabel = selected
    ? locale === "fa"
      ? grid.cols[selected.col]?.labelFa
      : grid.cols[selected.col]?.labelEn
    : null;

  function onCell(row: number, col: number) {
    if (done || pending) return;
    if (grid.cells[cellKey(row, col)]) return;
    playSound("click");
    setSelected({ row, col });
  }

  function onPick(playerId: string) {
    if (!selected || pending || done) return;
    startTransition(async () => {
      const res = await submitGridGuess({
        row: selected.row,
        col: selected.col,
        playerId,
      });
      if (!res.ok) {
        haptic(HAPTIC.light);
        if (res.error === "duplicate_player")
          toast.error(t("grid.errDuplicate"));
        else if (res.error === "cell_filled")
          toast.error(t("grid.errFilled"));
        else if (res.error === "already_done")
          toast.error(t("grid.errDone"));
        else toast.error(t("grid.errGeneric"));
        return;
      }
      setGrid(res.grid);
      setQuery("");
      if (res.unlockedBadges.length > 0) {
        setUnlockedBadges(res.unlockedBadges);
      }
      if (res.correct) {
        playSound("goal");
        haptic(HAPTIC.tap);
        setSelected(null);
      } else {
        playSound("miss");
        haptic(HAPTIC.miss);
      }
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      {unlockedBadges.length > 0 && (
        <BadgeUnlockPopup
          badges={unlockedBadges}
          onClose={() => setUnlockedBadges([])}
        />
      )}

      <header className="relative flex shrink-0 items-center justify-between gap-2 pt-0.5">
        <div className="min-w-0 flex items-center gap-3">
          <h1 className="font-display text-xl font-black text-foreground">
            {t("grid.title")}
          </h1>
          <div className="flex items-center gap-2.5 font-display text-sm font-black tabular-nums">
            <span className="text-primary">
              {toLocaleDigits(grid.filled, locale)}/
              {toLocaleDigits(grid.totalCells, locale)}
            </span>
            <span className="text-destructive">
              {toLocaleDigits(grid.mistakeCount, locale)}/
              {toLocaleDigits(grid.maxMistakes, locale)}
            </span>
            <span className="text-accent-deep">
              🔥 {toLocaleDigits(grid.gridStreak, locale)}
            </span>
          </div>
        </div>
        <Link
          href="/play"
          onClick={() => playSound("click")}
          aria-label={t("common.back")}
          className="flex h-11 w-11 shrink-0 items-center justify-center active:scale-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/close.png"
            alt=""
            draggable={false}
            className="h-9 w-9 object-contain"
          />
        </Link>
      </header>

      {done && (
        <div className="shrink-0 rounded-bubble-lg bg-surface p-4 text-center shadow-fantasy ring-1 ring-border/60">
          <p className="font-display text-lg font-black text-foreground">
            {grid.status === "SOLVED" ? t("grid.solved") : t("grid.failed")}
          </p>
          {grid.shareCode ? (
            <pre className="mt-2 font-display text-sm leading-relaxed">
              {grid.shareCode}
            </pre>
          ) : null}
        </div>
      )}

      {/* Grid board */}
      <div className="shrink-0 overflow-x-auto rounded-bubble-lg bg-linear-to-b from-[#1c2738] to-[#121820] p-2 shadow-fantasy ring-1 ring-white/10">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `minmax(4.5rem,1fr) repeat(3, minmax(4.5rem,1fr))`,
          }}
        >
          <div />
          {grid.cols.map((c) => (
            <div
              key={c.id}
              className="flex min-h-12 items-center justify-center rounded-xl bg-white/5 px-1 text-center font-display text-[10px] font-extrabold leading-tight text-amber-100"
            >
              {locale === "fa" ? c.labelFa : c.labelEn}
            </div>
          ))}
          {grid.rows.map((r, ri) => (
            <div key={r.id} className="contents">
              <div className="flex min-h-16 items-center justify-center rounded-xl bg-white/5 px-1 text-center font-display text-[10px] font-extrabold leading-tight text-sky-100">
                {locale === "fa" ? r.labelFa : r.labelEn}
              </div>
              {grid.cols.map((_, ci) => {
                const key = cellKey(ri, ci);
                const filled = grid.cells[key];
                const active =
                  selected?.row === ri && selected?.col === ci && !filled;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    disabled={done || Boolean(filled) || pending}
                    onClick={() => onCell(ri, ci)}
                    whileTap={filled || done ? undefined : { scale: 0.96 }}
                    className={[
                      "flex min-h-16 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center ring-1 transition-colors",
                      filled
                        ? "bg-emerald-600/35 ring-emerald-400/40"
                        : active
                          ? "bg-primary/35 ring-primary"
                          : "bg-black/25 ring-white/10 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {filled ? (
                      <span className="font-display text-[11px] font-black leading-snug text-white">
                        {locale === "fa" ? filled.nameFa : filled.nameEn}
                      </span>
                    ) : (
                      <span className="font-display text-lg font-black text-white/25">
                        +
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!done && selected && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative flex min-h-64 flex-1 flex-col overflow-hidden rounded-bubble-lg bg-linear-to-b from-[#1a2f24] via-[#15261c] to-[#0f1612] p-3 shadow-[0_12px_32px_rgba(16,40,24,0.45)] ring-1 ring-emerald-400/30"
        >
          {/* Pitch stripe atmosphere */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 18px, #fff 18px 19px)",
            }}
          />

          {/* Target HUD — selected cell axes */}
          <div className="relative mb-2.5 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/target.png"
              alt=""
              draggable={false}
              className="h-9 w-9 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-300/85">
                {t("grid.pickPlayer")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex max-w-[46%] truncate rounded-full bg-sky-400/20 px-2.5 py-0.5 font-display text-[11px] font-black text-sky-100 ring-1 ring-sky-300/35">
                  {selectedRowLabel}
                </span>
                <span className="font-display text-xs font-black text-emerald-300/70">
                  ×
                </span>
                <span className="inline-flex max-w-[46%] truncate rounded-full bg-amber-400/20 px-2.5 py-0.5 font-display text-[11px] font-black text-amber-100 ring-1 ring-amber-300/35">
                  {selectedColLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setSelected(null);
                setQuery("");
              }}
              aria-label={t("common.back")}
              className="flex h-11 w-11 shrink-0 items-center justify-center active:scale-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/close.png"
                alt=""
                draggable={false}
                className="h-8 w-8 object-contain"
              />
            </button>
          </div>

          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("grid.searchPlaceholder")}
              autoFocus
              className="min-h-12 w-full rounded-2xl bg-black/35 px-3.5 font-display text-sm font-bold text-white outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-2 focus:ring-emerald-400/50"
            />
          </div>

          <ul className="relative mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pe-0.5 [-webkit-overflow-scrolling:touch]">
            {filtered.length === 0 ? (
              <li className="flex h-full min-h-24 items-center justify-center px-3 text-center font-display text-sm font-bold text-white/45">
                …
              </li>
            ) : (
              filtered.map((o, i) => (
                <motion.li
                  key={o.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                >
                  <motion.button
                    type="button"
                    disabled={pending}
                    whileTap={pending ? undefined : { scale: 0.97 }}
                    onClick={() => onPick(o.id)}
                    className="group flex w-full min-h-14 items-center gap-3 rounded-2xl bg-white/6 px-3 py-2.5 text-start ring-1 ring-white/10 transition-colors hover:bg-emerald-400/15 hover:ring-emerald-300/40 active:bg-emerald-400/25 disabled:opacity-60"
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/40 to-lime-600/20 font-display text-sm font-black text-emerald-100 shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] ring-1 ring-emerald-300/30"
                    >
                      {(locale === "fa" ? o.nameFa : o.nameEn)
                        .trim()
                        .slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-sm font-black text-white">
                        {locale === "fa" ? o.nameFa : o.nameEn}
                      </span>
                      <span className="mt-0.5 inline-flex max-w-full truncate rounded-full bg-black/30 px-2 py-0.5 font-display text-[10px] font-bold text-white/60 ring-1 ring-white/10">
                        {o.club}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="font-display text-lg font-black text-emerald-300/50 transition-colors group-hover:text-emerald-300"
                    >
                      ›
                    </span>
                  </motion.button>
                </motion.li>
              ))
            )}
          </ul>
        </motion.div>
      )}

      {!done && !selected && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-bubble-lg bg-linear-to-b from-primary/10 to-transparent px-4 py-6 text-center">
          <span
            aria-hidden
            className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 font-display text-3xl font-black text-primary shadow-fantasy-sm ring-1 ring-primary/30"
          >
            +
          </span>
          <p className="font-display text-sm font-extrabold text-foreground/80">
            {t("grid.tapCell")}
          </p>
        </div>
      )}
    </section>
  );
}
