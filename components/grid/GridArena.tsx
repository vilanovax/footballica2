"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { DailyGridSnapshot } from "@/actions/grid/getDailyGrid";
import { submitGridGuess } from "@/actions/grid/submitGridGuess";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import { BadgeUnlockPopup } from "@/components/quiz/BadgeUnlockPopup";
import { GotdResultModal } from "@/components/play/GotdResultModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { buildGridShareCode } from "@/lib/grid/share";
import { cellKey } from "@/lib/grid/types";
import type { GotdRewardsPayload } from "@/lib/game/gotdRewards";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playerPhotoSrc } from "@/lib/players/photos";

type Props = {
  initial: DailyGridSnapshot;
};

const GRID_MOOD = "#071510";

export function GridArena({ initial }: Props) {
  const { t, locale } = useTranslation();
  const [grid, setGrid] = useState(initial);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  /** Cell key currently shaking / crimson-flashing (temporary — not locked). */
  const [missCellKey, setMissCellKey] = useState<string | null>(null);
  const [livesPulse, setLivesPulse] = useState(false);
  const [rewards, setRewards] = useState<GotdRewardsPayload | null>(null);
  const [previousStreak, setPreviousStreak] = useState(0);
  const [showResult, setShowResult] = useState(
    initial.status === "SOLVED" || initial.status === "FAILED",
  );

  // Match browser chrome to dark emerald pitch (undo Day Match cream).
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
      if (res.rewards) setRewards(res.rewards);
      setPreviousStreak(res.previousStreak);
      if (res.correct) {
        playSound("goal");
        haptic(HAPTIC.tap);
        setSelected(null);
        if (res.grid.status === "SOLVED") {
          window.setTimeout(() => setShowResult(true), 380);
        }
      } else {
        // Close sheet so the cell shake/crimson flash is visible on the board.
        setSelected(null);
        flashMiss(attemptRow, attemptCol);
        playSound("miss");
        haptic(HAPTIC.miss);
        if (res.grid.status === "FAILED") {
          window.setTimeout(() => setShowResult(true), 420);
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
    <section className="relative flex min-h-dvh flex-1 flex-col gap-3 bg-[#071510] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-linear-to-b from-[#0a1f14] via-[#071510] to-[#052e16]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 12px, #fff 12px, #fff 13px)",
          }}
        />
        <div className="absolute -end-16 top-0 h-56 w-56 rounded-full bg-amber-400/12 blur-3xl" />
        <div className="absolute -start-20 top-40 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      {unlockedBadges.length > 0 && !showResult && (
        <BadgeUnlockPopup
          badges={unlockedBadges}
          onClose={() => setUnlockedBadges([])}
        />
      )}

      <GotdResultModal
        open={showResult && done}
        outcome={grid.status === "SOLVED" ? "SOLVED" : "FAILED"}
        kind="grid"
        rewards={rewards}
        previousStreak={previousStreak}
        currentStreak={grid.gridStreak}
        shareCode={boardShare}
        unlockedBadges={unlockedBadges}
        onShare={copyShare}
        onClose={() => setShowResult(false)}
      />

      <header className="relative z-10 shrink-0 overflow-hidden rounded-2xl bg-linear-to-br from-[#052e16] via-[#0f172a] to-[#052e16] px-2.5 py-2 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_4px_0_0_rgba(0,0,0,0.35)] pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="relative flex items-center gap-2">
          <Link
            href="/play"
            onClick={() => playSound("click")}
            aria-label={t("common.back")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_3px_0_0_rgba(0,0,0,0.35)] transition-transform active:scale-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/close.png"
              alt=""
              draggable={false}
              className="h-5 w-5 object-contain opacity-90"
            />
          </Link>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/35 bg-black/40 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/guesses.png"
              alt=""
              draggable={false}
              className="h-7 w-7 object-contain"
            />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-black leading-tight text-white">
              {t("grid.title")}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-black/40 px-1.5 py-0.5 font-display text-[11px] font-black tabular-nums text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/target.png"
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="h-3.5 w-3.5 object-contain"
                />
                {toLocaleDigits(grid.filled, locale)}/
                {toLocaleDigits(grid.totalCells, locale)}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-black/40 px-1.5 py-0.5 font-display text-[11px] font-black tabular-nums text-amber-200 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/streak.png"
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="h-3.5 w-3.5 object-contain"
                />
                {toLocaleDigits(grid.gridStreak, locale)}
              </span>
            </div>
          </div>

          <motion.div
            key={livesLeft}
            aria-label={t("grid.livesLabel")}
            className={[
              "flex shrink-0 items-center gap-1 rounded-xl bg-black/40 px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.4)]",
              livesPulse ? "animate-lives-pulse" : "",
              livesLeft <= 2 && !done
                ? "shadow-[inset_0_0_0_1px_rgba(251,113,133,0.7),0_0_14px_rgba(244,63,94,0.35)]"
                : "",
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
        </div>
      </header>

      {/* 3×3 board — central focus */}
      <div
        className={[
          "relative z-10 mx-auto w-full max-w-md shrink-0 overflow-x-auto rounded-bubble-xl bg-linear-to-br from-[#0a1f14] via-[#0f172a] to-[#052e16] p-2.5 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_5px_0_0_rgba(0,0,0,0.35)] transition-opacity",
          done && showResult ? "opacity-40" : "",
        ].join(" ")}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
          aria-hidden
        />
        <div
          className="relative grid gap-1.5"
          style={{
            gridTemplateColumns: `minmax(4.25rem,1fr) repeat(3, minmax(4.25rem,1fr))`,
          }}
        >
          {/* Corner badge */}
          <div className="flex min-h-12 items-center justify-center rounded-xl bg-black/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/guesses.png"
              alt=""
              aria-hidden
              draggable={false}
              className="h-5 w-5 object-contain opacity-70"
            />
          </div>

          {grid.cols.map((c) => (
            <div
              key={c.id}
              className="flex min-h-12 items-center justify-center rounded-xl bg-linear-to-b from-amber-500/25 to-amber-900/30 px-1 text-center shadow-[inset_0_0_0_1px_rgba(251,191,36,0.4),0_2px_0_0_rgba(0,0,0,0.3)]"
            >
              <span className="line-clamp-2 font-display text-[10px] font-black leading-tight text-amber-50">
                {locale === "fa" ? c.labelFa : c.labelEn}
              </span>
            </div>
          ))}

          {grid.rows.map((r, ri) => (
            <div key={r.id} className="contents">
              <div className="flex min-h-19 items-center justify-center rounded-xl bg-linear-to-b from-sky-500/20 to-sky-900/35 px-1 text-center shadow-[inset_0_0_0_1px_rgba(125,211,252,0.35),0_2px_0_0_rgba(0,0,0,0.3)]">
                <span className="line-clamp-3 font-display text-[10px] font-black leading-tight text-sky-50">
                  {locale === "fa" ? r.labelFa : r.labelEn}
                </span>
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
                const photoSrc = filled
                  ? playerPhotoSrc(filled.playerId)
                  : null;

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
                        ? "bg-emerald-500/20 shadow-[0_0_0_2px_rgba(52,211,153,0.55),0_0_18px_rgba(52,211,153,0.3)]"
                        : active
                          ? "bg-emerald-500/15 shadow-[0_0_0_2px_rgba(52,211,153,0.7),0_0_16px_rgba(52,211,153,0.25)]"
                          : "bg-black/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] active:bg-white/10",
                    ].join(" ")}
                  >
                    {filled ? (
                      <>
                        {photoSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoSrc}
                            alt=""
                            draggable={false}
                            className="h-8 w-8 rounded-full object-cover shadow-[0_0_0_1px_rgba(167,243,208,0.5)]"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/40 font-display text-xs font-black text-emerald-50 shadow-[0_0_0_1px_rgba(167,243,208,0.45)]"
                          >
                            {name.trim().slice(0, 1)}
                          </span>
                        )}
                        <span className="line-clamp-2 font-display text-[10px] font-black leading-tight text-white">
                          {name}
                        </span>
                      </>
                    ) : isMiss ? (
                      <span className="font-display text-lg font-black text-rose-200">
                        ✕
                      </span>
                    ) : (
                      <span
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-black",
                          active
                            ? "bg-emerald-400/25 text-emerald-200"
                            : "bg-white/5 text-white/30",
                        ].join(" ")}
                        aria-hidden
                      >
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
            className="min-h-12 w-full rounded-2xl bg-black/45 px-3.5 font-display text-sm font-bold text-white outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] placeholder:text-white/35 focus:shadow-[inset_0_0_0_2px_rgba(52,211,153,0.45)]"
          />

          <ul className="max-h-[min(48dvh,22rem)] space-y-1.5 overflow-y-auto overscroll-contain pe-0.5 [-webkit-overflow-scrolling:touch]">
            {filtered.length === 0 ? (
              <li className="flex min-h-24 items-center justify-center px-3 text-center font-display text-sm font-bold text-white/40">
                …
              </li>
            ) : (
              filtered.map((o) => {
                const label = locale === "fa" ? o.nameFa : o.nameEn;
                const photo = playerPhotoSrc(o.id);
                return (
                  <li key={o.id}>
                    <motion.button
                      type="button"
                      disabled={pending}
                      whileTap={pending ? undefined : { scale: 0.97 }}
                      onClick={() => onPick(o.id)}
                      className="group flex w-full min-h-14 items-center gap-3 rounded-2xl bg-black/40 px-3 py-2.5 text-start shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-colors active:bg-emerald-500/20 disabled:opacity-60"
                    >
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt=""
                          draggable={false}
                          className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-sm font-black text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                        >
                          {label.trim().slice(0, 1)}
                        </span>
                      )}
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
    </section>
  );
}
