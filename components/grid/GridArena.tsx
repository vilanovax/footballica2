"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { DailyGridSnapshot } from "@/actions/grid/getDailyGrid";
import { submitGridGuess } from "@/actions/grid/submitGridGuess";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import { BadgeUnlockPopup } from "@/components/quiz/BadgeUnlockPopup";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { buildGridShareCode } from "@/lib/grid/share";
import { cellKey } from "@/lib/grid/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type Props = {
  initial: DailyGridSnapshot;
};

const GRID_MOOD = "#0a0f14";

/** Optional photo path convention — shown when asset exists in /public. */
function playerPhotoSrc(playerId: string): string {
  return `/players/${playerId}.png`;
}

export function GridArena({ initial }: Props) {
  const { t, locale } = useTranslation();
  const [grid, setGrid] = useState(initial);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [photoOk, setPhotoOk] = useState<Record<string, boolean>>({});
  /** Cell key currently shaking / crimson-flashing (temporary — not locked). */
  const [missCellKey, setMissCellKey] = useState<string | null>(null);
  const [livesPulse, setLivesPulse] = useState(false);
  const [showGameOver, setShowGameOver] = useState(
    initial.status === "FAILED",
  );

  // Match browser chrome to dark Locker Room (undo Day Match cream).
  useEffect(() => {
    const metas = Array.from(
      document.querySelectorAll('meta[name="theme-color"]'),
    ) as HTMLMetaElement[];
    const prev = metas.map((m) => m.getAttribute("content"));
    if (metas.length === 0) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = GRID_MOOD;
      document.head.appendChild(meta);
      document.documentElement.style.backgroundColor = GRID_MOOD;
      document.body.style.backgroundColor = GRID_MOOD;
      document.body.style.backgroundImage = "none";
      return () => {
        meta.remove();
        document.documentElement.style.backgroundColor = "";
        document.body.style.backgroundColor = "";
        document.body.style.backgroundImage = "";
      };
    }
    for (const m of metas) m.setAttribute("content", GRID_MOOD);
    document.documentElement.style.backgroundColor = GRID_MOOD;
    document.body.style.backgroundColor = GRID_MOOD;
    document.body.style.backgroundImage = "none";
    return () => {
      metas.forEach((m, i) => {
        if (prev[i] != null) m.setAttribute("content", prev[i]!);
      });
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = "";
    };
  }, []);

  const done = grid.status === "SOLVED" || grid.status === "FAILED";
  const livesLeft = Math.max(0, grid.maxMistakes - grid.mistakeCount);
  const boardShare = grid.shareCode || buildGridShareCode(grid.cells);

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

  const sheetSubtitle =
    selectedRowLabel && selectedColLabel
      ? `${selectedRowLabel} × ${selectedColLabel}`
      : undefined;

  function flashMiss(row: number, col: number) {
    const key = cellKey(row, col);
    setMissCellKey(key);
    setLivesPulse(true);
    window.setTimeout(() => setMissCellKey(null), 560);
    window.setTimeout(() => setLivesPulse(false), 480);
  }

  function onCell(row: number, col: number) {
    if (done || pending) return;
    if (grid.cells[cellKey(row, col)]) return;
    playSound("click");
    setQuery("");
    setSelected({ row, col });
  }

  function closePicker() {
    playSound("click");
    setSelected(null);
    setQuery("");
  }

  function onPick(playerId: string) {
    if (!selected || pending || done) return;
    const attemptRow = selected.row;
    const attemptCol = selected.col;
    startTransition(async () => {
      const res = await submitGridGuess({
        row: attemptRow,
        col: attemptCol,
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
        // Close sheet so the cell shake/crimson flash is visible on the board.
        setSelected(null);
        flashMiss(attemptRow, attemptCol);
        playSound("miss");
        haptic(HAPTIC.miss);
        if (res.grid.status === "FAILED") {
          window.setTimeout(() => setShowGameOver(true), 420);
        }
      }
    });
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(boardShare);
      toast.success(t("grid.shared"));
      playSound("click");
    } catch {
      toast.error(t("grid.errGeneric"));
    }
  }

  return (
    <section className="relative flex min-h-dvh flex-1 flex-col gap-4 bg-linear-to-b from-[#0c1218] via-[#111a22] to-[#0a0f14] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#0a0f14]" />
        <div className="absolute -end-16 top-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -start-20 top-48 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      {unlockedBadges.length > 0 && (
        <BadgeUnlockPopup
          badges={unlockedBadges}
          onClose={() => setUnlockedBadges([])}
        />
      )}

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex flex-1 items-center gap-2.5">
          <h1 className="truncate font-display text-xl font-black text-white">
            {t("grid.title")}
          </h1>
          <div className="flex items-center gap-2 font-display text-sm font-black tabular-nums">
            <span
              className="text-emerald-300"
              title={`${toLocaleDigits(grid.filled, locale)}/${toLocaleDigits(grid.totalCells, locale)}`}
            >
              {toLocaleDigits(grid.filled, locale)}/
              {toLocaleDigits(grid.totalCells, locale)}
            </span>
            <span className="text-amber-300">
              🔥 {toLocaleDigits(grid.gridStreak, locale)}
            </span>
          </div>
        </div>

        {/* Lives — Immortal-style remaining chances */}
        <motion.div
          key={livesLeft}
          aria-label={t("grid.livesLabel")}
          className={[
            "me-1 flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 ring-1 ring-rose-400/35",
            livesPulse ? "animate-lives-pulse" : "",
            livesLeft <= 2 && !done ? "ring-rose-400/70" : "",
          ].join(" ")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              livesLeft === 0
                ? "/icons/broken-heart.png"
                : "/icons/heart.png"
            }
            alt=""
            draggable={false}
            className="h-5 w-5 object-contain"
          />
          <span
            className={[
              "font-display text-sm font-black tabular-nums",
              livesLeft <= 2 ? "text-rose-300" : "text-rose-100",
            ].join(" ")}
          >
            {t("grid.livesLeft", {
              cur: toLocaleDigits(livesLeft, locale),
              max: toLocaleDigits(grid.maxMistakes, locale),
            })}
          </span>
        </motion.div>

        <Link
          href="/play"
          onClick={() => playSound("click")}
          aria-label={t("common.back")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white active:scale-90"
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </Link>
      </header>

      {grid.status === "SOLVED" && (
        <div className="relative z-10 shrink-0 rounded-bubble-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-center shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          <p className="font-display text-lg font-black text-emerald-200">
            {t("grid.solved")}
          </p>
          {boardShare ? (
            <pre className="mt-2 font-display text-sm leading-relaxed text-white/80">
              {boardShare}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={copyShare}
            className="mt-3 min-h-11 rounded-2xl bg-white/10 px-4 font-display text-sm font-bold text-white ring-1 ring-white/15"
          >
            {t("grid.share")}
          </button>
        </div>
      )}

      {/* 3×3 board — central focus */}
      <div
        className={[
          "relative z-10 mx-auto w-full max-w-md shrink-0 overflow-x-auto rounded-bubble-lg bg-linear-to-b from-[#1c2738] to-[#121820] p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition-opacity",
          grid.status === "FAILED" && showGameOver ? "opacity-40" : "",
        ].join(" ")}
      >
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
              <div className="flex min-h-19 items-center justify-center rounded-xl bg-white/5 px-1 text-center font-display text-[10px] font-extrabold leading-tight text-sky-100">
                {locale === "fa" ? r.labelFa : r.labelEn}
              </div>
              {grid.cols.map((_, ci) => {
                const key = cellKey(ri, ci);
                const filled = grid.cells[key];
                const active =
                  selected?.row === ri && selected?.col === ci && !filled;
                const isMiss = missCellKey === key;
                const name = filled
                  ? locale === "fa"
                    ? filled.nameFa
                    : filled.nameEn
                  : "";
                const photoState = filled
                  ? photoOk[filled.playerId]
                  : undefined;

                return (
                  <motion.button
                    key={key}
                    type="button"
                    disabled={done || Boolean(filled) || pending}
                    onClick={() => onCell(ri, ci)}
                    whileTap={filled || done ? undefined : { scale: 0.96 }}
                    className={[
                      "relative flex min-h-19 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-1 py-1.5 text-center transition-colors",
                      isMiss ? "animate-grid-cell-miss z-10" : "",
                      filled
                        ? "bg-emerald-500/20 ring-2 ring-emerald-400/55 shadow-[0_0_18px_rgba(52,211,153,0.35)]"
                        : active
                          ? "bg-white/12 ring-2 ring-emerald-400/70"
                          : "bg-black/30 ring-1 ring-white/10 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {filled ? (
                      <>
                        {photoState === true ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={playerPhotoSrc(filled.playerId)}
                            alt=""
                            draggable={false}
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-emerald-300/50"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/35 font-display text-xs font-black text-emerald-50 ring-1 ring-emerald-300/45"
                          >
                            {name.trim().slice(0, 1)}
                          </span>
                        )}
                        {photoState == null ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={playerPhotoSrc(filled.playerId)}
                            alt=""
                            aria-hidden
                            className="pointer-events-none absolute h-0 w-0 opacity-0"
                            onLoad={() =>
                              setPhotoOk((m) => ({
                                ...m,
                                [filled.playerId]: true,
                              }))
                            }
                            onError={() =>
                              setPhotoOk((m) => ({
                                ...m,
                                [filled.playerId]: false,
                              }))
                            }
                          />
                        ) : null}
                        <span className="line-clamp-2 font-display text-[10px] font-black leading-tight text-white">
                          {name}
                        </span>
                      </>
                    ) : isMiss ? (
                      <span className="font-display text-lg font-black text-rose-200">
                        ✕
                      </span>
                    ) : (
                      <span className="font-display text-base font-black text-white/20">
                        ·
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <BottomSheet
        open={Boolean(selected) && !done}
        onClose={closePicker}
        title={t("grid.pickPlayer")}
        subtitle={sheetSubtitle}
        closeLabel={t("common.back")}
        tone="dark"
      >
        <div className="flex flex-col gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("grid.searchPlaceholder")}
            autoFocus
            className="min-h-12 w-full rounded-2xl bg-white/8 px-3.5 font-display text-sm font-bold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:ring-2 focus:ring-emerald-400/45"
          />

          <ul className="max-h-[min(48dvh,22rem)] space-y-1.5 overflow-y-auto overscroll-contain pe-0.5 [-webkit-overflow-scrolling:touch]">
            {filtered.length === 0 ? (
              <li className="flex min-h-24 items-center justify-center px-3 text-center font-display text-sm font-bold text-white/40">
                …
              </li>
            ) : (
              filtered.map((o) => {
                const label = locale === "fa" ? o.nameFa : o.nameEn;
                return (
                  <li key={o.id}>
                    <motion.button
                      type="button"
                      disabled={pending}
                      whileTap={pending ? undefined : { scale: 0.97 }}
                      onClick={() => onPick(o.id)}
                      className="group flex w-full min-h-14 items-center gap-3 rounded-2xl bg-white/6 px-3 py-2.5 text-start ring-1 ring-white/10 transition-colors hover:bg-white/12 hover:ring-white/25 active:bg-emerald-500/20 disabled:opacity-60"
                    >
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-sm font-black text-white/90 ring-1 ring-white/15"
                      >
                        {label.trim().slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm font-black text-white">
                          {label}
                        </span>
                        <span className="mt-0.5 block truncate font-display text-[11px] font-bold text-white/45">
                          {o.club}
                        </span>
                      </span>
                    </motion.button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </BottomSheet>

      {/* FAILED — polished game-over overlay */}
      <AnimatePresence>
        {showGameOver && grid.status === "FAILED" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label={t("common.back")}
              className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
              onClick={() => setShowGameOver(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="grid-game-over-title"
              initial={{ y: 40, opacity: 0.9, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="relative z-10 mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] w-full max-w-sm overflow-hidden rounded-bubble-xl border border-rose-400/25 bg-[#141c24] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:mb-0"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 ring-1 ring-rose-400/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/broken-heart.png"
                  alt=""
                  draggable={false}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <h2
                id="grid-game-over-title"
                className="text-center font-display text-xl font-black text-white"
              >
                {t("grid.gameOverTitle")}
              </h2>
              <p className="mt-1.5 text-center font-display text-sm font-bold text-white/55">
                {t("grid.gameOverBody", {
                  n: toLocaleDigits(grid.maxMistakes, locale),
                })}
              </p>
              <pre className="mt-4 rounded-2xl bg-black/35 px-3 py-3 text-center font-display text-base leading-relaxed text-white/85 ring-1 ring-white/10">
                {boardShare}
              </pre>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={copyShare}
                  className="flex min-h-touch w-full items-center justify-center rounded-2xl bg-white/10 font-display text-base font-extrabold text-white ring-1 ring-white/15"
                >
                  {t("grid.share")}
                </button>
                <Link
                  href="/play"
                  onClick={() => playSound("click")}
                  className="flex min-h-touch w-full items-center justify-center rounded-2xl bg-rose-500/90 font-display text-base font-extrabold text-white shadow-[0_6px_0_0_rgba(136,19,55,0.9)]"
                >
                  {t("grid.backPlay")}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
