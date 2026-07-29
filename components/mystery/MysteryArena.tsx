"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import type { DailyMysterySnapshot } from "@/actions/mystery/getDailyMystery";
import { submitMysteryGuess } from "@/actions/mystery/submitGuess";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import type {
  AttributeVerdict,
  CompareVerdict,
  MysteryGuessRecord,
} from "@/lib/mystery";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { MysteryShareCard } from "@/components/mystery/MysteryShareCard";
import { BadgeUnlockPopup } from "@/components/quiz/BadgeUnlockPopup";

type Props = {
  initial: DailyMysterySnapshot;
};

/** Solid Wordle-style tiles — high contrast on light/dark surfaces. */
function verdictStyle(v: AttributeVerdict | CompareVerdict): {
  tile: string;
  glyph: string;
} {
  if (v === "correct")
    return {
      tile: "bg-emerald-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
      glyph: "✓",
    };
  if (v === "close")
    return {
      tile: "bg-amber-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
      glyph: "~",
    };
  if (v === "higher")
    return {
      tile: "bg-sky-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
      glyph: "▲",
    };
  if (v === "lower")
    return {
      tile: "bg-sky-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
      glyph: "▼",
    };
  return {
    tile: "bg-rose-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
    glyph: "✕",
  };
}

function verdictLabel(
  v: AttributeVerdict | CompareVerdict,
  t: (k: string) => string,
): string {
  if (v === "correct") return t("mystery.legendCorrect");
  if (v === "close") return t("mystery.legendClose");
  if (v === "higher") return t("mystery.legendHigher");
  if (v === "lower") return t("mystery.legendLower");
  return t("mystery.legendWrong");
}

export function MysteryArena({ initial }: Props) {
  const { t, locale } = useTranslation();
  const [mystery, setMystery] = useState(initial);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [howOpen, setHowOpen] = useState(mystery.guesses.length === 0);

  const done = mystery.status === "SOLVED" || mystery.status === "FAILED";
  const remaining = Math.max(0, mystery.maxGuesses - mystery.guessCount);
  const guessedIds = useMemo(
    () => new Set(mystery.guesses.map((g) => g.playerId)),
    [mystery.guesses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mystery.options
      .filter((o) => !guessedIds.has(o.id))
      .filter((o) => {
        if (!q) return true;
        return (
          o.nameEn.toLowerCase().includes(q) ||
          o.nameFa.includes(query.trim()) ||
          o.club.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [mystery.options, guessedIds, query]);

  const selectedLabel = useMemo(() => {
    if (!selectedId) return null;
    const o = mystery.options.find((x) => x.id === selectedId);
    if (!o) return null;
    return locale === "fa" ? o.nameFa : o.nameEn;
  }, [selectedId, mystery.options, locale]);

  function onGuess() {
    if (!selectedId || pending || done) return;
    startTransition(async () => {
      const res = await submitMysteryGuess(selectedId);
      if (!res.ok) {
        haptic(HAPTIC.light);
        if (res.error === "duplicate_guess")
          toast.error(t("mystery.errDuplicate"));
        else if (res.error === "already_done")
          toast.error(t("mystery.errDone"));
        else toast.error(t("mystery.errGeneric"));
        return;
      }
      setMystery(res.mystery);
      setSelectedId(null);
      setQuery("");
      setHowOpen(false);
      if (res.unlockedBadges.length > 0) {
        setUnlockedBadges(res.unlockedBadges);
      }
      const last = res.mystery.guesses[res.mystery.guesses.length - 1];
      if (last?.isCorrect) {
        playSound("goal");
        haptic(HAPTIC.tap);
      } else if (res.mystery.status === "FAILED") {
        playSound("miss");
        haptic(HAPTIC.miss);
      } else {
        playSound("click");
        haptic(HAPTIC.light);
      }
    });
  }

  const answerName =
    locale === "fa" ? mystery.answer?.nameFa : mystery.answer?.nameEn;

  return (
    <section className="flex flex-1 flex-col gap-3">
      {/* ── Compact hero ─────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-bubble-lg bg-linear-to-br from-secondary/35 via-primary/12 to-accent/20 px-3.5 pb-3.5 pt-2.5 shadow-fantasy-lg"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-12 h-36 w-36 rounded-full bg-secondary/35 blur-3xl"
        />

        <div className="relative flex justify-end">
          <Link
            href="/play"
            onClick={() => playSound("click")}
            aria-label={t("common.back")}
            className="flex h-11 w-11 items-center justify-center active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/back.png"
              alt=""
              draggable={false}
              className="h-9 w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
            />
          </Link>
        </div>

        <div className="relative mt-1 flex items-center gap-3">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="shrink-0"
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/mystery.png"
              alt=""
              draggable={false}
              className="h-14 w-14 object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,0.22)]"
            />
          </motion.div>
          <div className="min-w-0 flex-1 text-start">
            <h1 className="font-display text-xl font-black leading-tight text-foreground">
              {t("mystery.title")}
            </h1>
            <p className="mt-0.5 font-display text-xs font-bold text-foreground/75">
              {t("mystery.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 font-display text-sm font-black tabular-nums text-primary shadow-fantasy-sm"
              title={t("mystery.guessesLabel")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/guesses.png"
                alt=""
                aria-hidden
                draggable={false}
                className="h-6 w-6 object-contain"
              />
              {toLocaleDigits(mystery.guessCount, locale)}/
              {toLocaleDigits(mystery.maxGuesses, locale)}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/25 px-2.5 py-1 font-display text-sm font-black tabular-nums text-accent-deep shadow-fantasy-sm"
              title={t("mystery.streakLabel")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/streak.png"
                alt=""
                aria-hidden
                draggable={false}
                className="h-6 w-6 object-contain"
              />
              {toLocaleDigits(mystery.mysteryStreak, locale)}
            </span>
          </div>
        </div>

        {!done && (
          <div
            className="relative mt-3 flex items-center justify-center gap-2"
            aria-label={`${toLocaleDigits(remaining, locale)} ${t("mystery.guessesLabel")}`}
          >
            {Array.from({ length: mystery.maxGuesses }).map((_, i) => {
              const g = mystery.guesses[i];
              const next = i === mystery.guessCount;
              let tone = "bg-muted-foreground/20";
              if (g?.isCorrect) tone = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]";
              else if (g) tone = "bg-secondary shadow-[0_0_8px_rgba(255,90,54,0.4)]";
              else if (next) tone = "bg-primary ring-2 ring-primary/45";
              return (
                <motion.span
                  key={i}
                  animate={next ? { scale: [1, 1.18, 1] } : undefined}
                  transition={
                    next
                      ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                      : undefined
                  }
                  className={["h-3 w-3 rounded-full", tone].join(" ")}
                />
              );
            })}
          </div>
        )}
      </motion.header>

      {/* ── How to play — quest plaque ───────────────────────── */}
      {!done && (
        <motion.div
          layout
          className="relative overflow-hidden rounded-bubble-lg bg-linear-to-br from-amber-500/25 via-secondary/15 to-primary/20 p-[3px] shadow-fantasy"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -end-8 -top-10 h-28 w-28 rounded-full bg-accent/30 blur-2xl"
          />
          <div className="relative overflow-hidden rounded-[1.35rem] bg-linear-to-b from-[#2a1f12]/92 to-[#1a140c]/95 text-white">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setHowOpen((v) => !v);
              }}
              className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2.5 text-start active:scale-[0.99]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/help.png"
                alt=""
                aria-hidden
                draggable={false}
                className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
              />
              <span className="min-w-0 flex-1 font-display text-base font-black tracking-wide text-amber-100 drop-shadow-sm">
                {t("mystery.howToTitle")}
              </span>
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/25 font-display text-sm font-black text-amber-200 ring-1 ring-amber-300/40 transition-transform",
                  howOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              >
                ▾
              </span>
            </button>
            <AnimatePresence initial={false}>
              {howOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 px-3 pb-3.5 text-start">
                    <p className="rounded-2xl bg-black/25 px-3 py-2.5 font-display text-sm font-bold leading-relaxed text-amber-50/95 ring-1 ring-amber-200/15">
                      {t("mystery.howToBody")}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <LegendChip tone="correct" label={t("mystery.legendCorrect")} />
                      <LegendChip tone="close" label={t("mystery.legendClose")} />
                      <LegendChip tone="wrong" label={t("mystery.legendWrong")} />
                      <LegendChip
                        tone="dir"
                        label={`▲ ${t("mystery.legendHigher")}`}
                        className="col-span-1"
                      />
                      <LegendChip
                        tone="dir"
                        label={`▼ ${t("mystery.legendLower")}`}
                        className="col-span-2"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {done && mystery.shareCode && (
        <div className="flex flex-col gap-3">
          <p className="text-center font-display text-xl font-black text-foreground">
            {mystery.status === "SOLVED"
              ? t("mystery.solved")
              : t("mystery.failed")}
          </p>
          <MysteryShareCard
            dateKey={mystery.dateKey}
            shareCode={mystery.shareCode}
            status={mystery.status === "SOLVED" ? "SOLVED" : "FAILED"}
            answerName={answerName ?? ""}
            guessCount={mystery.guessCount}
            maxGuesses={mystery.maxGuesses}
            mysteryStreak={mystery.mysteryStreak}
          />
          <Link
            href="/play"
            className="btn-fantasy btn-fantasy-primary flex min-h-touch w-full items-center justify-center"
          >
            {t("mystery.backPlay")}
          </Link>
        </div>
      )}

      {unlockedBadges.length > 0 && (
        <BadgeUnlockPopup
          badges={unlockedBadges}
          onClose={() => setUnlockedBadges([])}
        />
      )}

      {/* ── Clue board ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        {mystery.guesses.length === 0 && !done ? (
          <div className="flex flex-col items-center gap-2 rounded-bubble-lg bg-muted/30 px-4 py-7 text-center">
            <span className="text-3xl" aria-hidden>
              🧩
            </span>
            <p className="font-display text-sm font-bold text-muted-foreground">
              {t("mystery.emptyBoard")}
            </p>
          </div>
        ) : (
          mystery.guesses.map((g, i) => (
            <GuessRow key={`${g.playerId}-${g.at}`} guess={g} index={i} />
          ))
        )}
      </div>

      {!done && (
        <div
          aria-hidden
          className="h-[calc(10.5rem+theme(spacing.nav)+env(safe-area-inset-bottom,0px))] shrink-0"
        />
      )}

      {!done && (
        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-mobile px-3 pb-[calc(theme(spacing.nav)+env(safe-area-inset-bottom,0px))] pt-2"
        >
          <div className="pointer-events-auto rounded-t-bubble-lg bg-background/96 px-2 pt-2.5 shadow-[0_-10px_28px_rgba(0,0,0,0.12)] backdrop-blur-md">
            <p className="mb-1.5 text-center font-display text-[11px] font-bold text-muted-foreground">
              {selectedLabel ? `✓ ${selectedLabel}` : t("mystery.pickHint")}
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              placeholder={t("mystery.searchPlaceholder")}
              className="min-h-11 w-full rounded-2xl bg-surface px-3 font-display text-sm font-bold text-foreground outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/40"
            />
            <ul className="mt-1.5 max-h-28 overflow-y-auto rounded-2xl bg-surface ring-1 ring-border/70">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-center font-display text-xs font-bold text-muted-foreground">
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
                            ? "bg-primary/15 text-primary"
                            : "text-foreground hover:bg-muted/50",
                        ].join(" ")}
                      >
                        <span className="truncate">{label}</span>
                        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                          {o.club}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <motion.button
              type="button"
              disabled={!selectedId || pending}
              whileTap={!selectedId || pending ? undefined : { y: 3 }}
              onClick={onGuess}
              className={[
                "btn-fantasy mt-2 mb-1 w-full min-h-touch justify-center",
                selectedId && !pending
                  ? "btn-fantasy-primary"
                  : "bg-muted text-muted-foreground opacity-55",
              ].join(" ")}
            >
              {pending ? "…" : t("mystery.guess")}
            </motion.button>
          </div>
        </motion.footer>
      )}
    </section>
  );
}

function LegendChip({
  tone,
  label,
  className,
}: {
  tone: "correct" | "close" | "wrong" | "dir";
  label: string;
  className?: string;
}) {
  const bg =
    tone === "correct"
      ? "bg-emerald-600"
      : tone === "close"
        ? "bg-amber-500"
        : tone === "wrong"
          ? "bg-rose-600"
          : "bg-sky-600";
  return (
    <span
      className={[
        "flex min-h-10 items-center justify-center rounded-2xl px-2 py-1.5 text-center font-display text-[11px] font-black text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.22)] ring-1 ring-white/20",
        bg,
        className ?? "",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function GuessRow({
  guess,
  index,
}: {
  guess: MysteryGuessRecord;
  index: number;
}) {
  const { t, locale } = useTranslation();
  const name = locale === "fa" ? guess.nameFa : guess.nameEn;
  const cells: {
    key: string;
    label: string;
    v: AttributeVerdict | CompareVerdict;
  }[] = [
    { key: "n", label: t("mystery.colNation"), v: guess.nationality },
    { key: "p", label: t("mystery.colPos"), v: guess.position },
    { key: "l", label: t("mystery.colLeague"), v: guess.league },
    { key: "c", label: t("mystery.colClub"), v: guess.club },
    { key: "a", label: t("mystery.colAge"), v: guess.age },
    { key: "s", label: t("mystery.colShirt"), v: guess.shirtNumber },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 22,
        delay: index * 0.04,
      }}
      className={[
        "rounded-bubble-lg p-2.5 shadow-fantasy ring-1",
        guess.isCorrect
          ? "bg-emerald-500/10 ring-emerald-500/35"
          : "bg-surface ring-border/50",
      ].join(" ")}
    >
      <p className="mb-2 flex items-center gap-2 font-display text-sm font-extrabold text-foreground">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/90 font-display text-[11px] font-black text-background"
          aria-hidden
        >
          {toLocaleDigits(index + 1, locale)}
        </span>
        <span className="truncate">{name}</span>
        {guess.isCorrect && (
          <span className="ms-auto text-base" aria-hidden>
            ⚽
          </span>
        )}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {cells.map((c) => {
          const style = verdictStyle(c.v);
          return (
            <div
              key={c.key}
              title={verdictLabel(c.v, t)}
              className={[
                "flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-center",
                style.tile,
              ].join(" ")}
            >
              <span className="font-display text-[11px] font-extrabold leading-none tracking-wide text-white/95">
                {c.label}
              </span>
              <span className="font-display text-lg font-black leading-none drop-shadow-sm">
                {style.glyph}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
