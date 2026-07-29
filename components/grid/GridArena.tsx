"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { DailyGridSnapshot } from "@/actions/grid/getDailyGrid";
import { submitGridGuess } from "@/actions/grid/submitGridGuess";
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
      })
      .slice(0, 10);
  }, [grid.options, usedIds, query]);

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

  async function copyShare() {
    if (!grid.shareCode) return;
    const text = `Footballica Grid ${grid.dateKey}\n${grid.shareCode}\n${t("grid.mistakesShare", {
      n: toLocaleDigits(grid.mistakeCount, locale),
    })}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("grid.shared"));
    } catch {
      toast.error(t("grid.errGeneric"));
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-3">
      <header className="relative overflow-hidden rounded-bubble-lg bg-linear-to-br from-amber-500/25 via-primary/10 to-secondary/20 px-3.5 pb-3.5 pt-2.5 shadow-fantasy-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-black text-foreground">
              {t("grid.title")}
            </h1>
            <p className="mt-0.5 font-display text-xs font-bold text-foreground/70">
              {t("grid.subtitle")}
            </p>
          </div>
          <Link
            href="/play"
            onClick={() => playSound("click")}
            aria-label={t("common.back")}
            className="flex h-11 w-11 items-center justify-center active:scale-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/close.png"
              alt=""
              draggable={false}
              className="h-9 w-9 object-contain"
            />
          </Link>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 font-display text-sm font-black tabular-nums text-primary shadow-fantasy-sm">
            {toLocaleDigits(grid.filled, locale)}/
            {toLocaleDigits(grid.totalCells, locale)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 font-display text-sm font-black tabular-nums text-destructive shadow-fantasy-sm">
            {t("grid.mistakes", {
              cur: toLocaleDigits(grid.mistakeCount, locale),
              max: toLocaleDigits(grid.maxMistakes, locale),
            })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/25 px-2.5 py-1 font-display text-sm font-black tabular-nums text-accent-deep shadow-fantasy-sm">
            🔥 {toLocaleDigits(grid.gridStreak, locale)}
          </span>
        </div>
      </header>

      {done && (
        <div className="rounded-bubble-lg bg-surface p-4 text-center shadow-fantasy ring-1 ring-border/60">
          <p className="font-display text-lg font-black text-foreground">
            {grid.status === "SOLVED" ? t("grid.solved") : t("grid.failed")}
          </p>
          {grid.shareCode && (
            <pre className="mt-2 font-display text-sm leading-relaxed">
              {grid.shareCode}
            </pre>
          )}
          <button
            type="button"
            onClick={copyShare}
            className="btn-fantasy btn-fantasy-primary mt-3 min-h-11 w-full"
          >
            {t("grid.share")}
          </button>
        </div>
      )}

      {/* Grid board */}
      <div className="overflow-x-auto rounded-bubble-lg bg-linear-to-b from-[#1c2738] to-[#121820] p-2 shadow-fantasy ring-1 ring-white/10">
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
        <div className="rounded-bubble-lg bg-surface p-3 shadow-fantasy-sm ring-1 ring-border/60">
          <p className="mb-2 text-center font-display text-xs font-bold text-muted-foreground">
            {t("grid.pickPlayer")}
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("grid.searchPlaceholder")}
            className="min-h-11 w-full rounded-2xl bg-muted/40 px-3 font-display text-sm font-bold outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/40"
          />
          <ul className="mt-2 max-h-44 overflow-y-auto rounded-2xl ring-1 ring-border/70">
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onPick(o.id)}
                  className="flex w-full min-h-11 items-center justify-between gap-2 px-3 py-2 text-start font-display text-sm font-bold hover:bg-muted/50"
                >
                  <span>{locale === "fa" ? o.nameFa : o.nameEn}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {o.club}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!done && !selected && (
        <p className="text-center font-display text-sm font-bold text-muted-foreground">
          {t("grid.tapCell")}
        </p>
      )}
    </section>
  );
}
