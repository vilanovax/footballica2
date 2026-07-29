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

function verdictClass(v: AttributeVerdict | CompareVerdict): string {
  if (v === "correct")
    return "bg-emerald-500/30 text-emerald-900 ring-emerald-500/50 dark:text-emerald-100";
  if (v === "close")
    return "bg-amber-400/30 text-amber-950 ring-amber-400/50 dark:text-amber-100";
  if (v === "higher" || v === "lower")
    return "bg-sky-500/25 text-sky-950 ring-sky-500/40 dark:text-sky-100";
  return "bg-destructive/20 text-destructive ring-destructive/35";
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
      .slice(0, 12);
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
    <section className="flex flex-1 flex-col gap-4">
      {/* ── Mystery hero ─────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-bubble-lg bg-linear-to-br from-secondary/35 via-primary/12 to-accent/20 px-4 pb-5 pt-3 shadow-fantasy-lg"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-12 h-40 w-40 rounded-full bg-secondary/35 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-8 bottom-0 h-28 w-28 rounded-full bg-primary/25 blur-2xl"
        />

        <div className="relative flex items-start justify-between gap-2">
          <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-secondary">
            {t("play.gameOfTheDay")} · {mystery.dateKey}
          </p>
          <Link
            href="/play"
            onClick={() => playSound("click")}
            className="flex h-9 items-center rounded-full bg-surface/85 px-3 font-display text-[11px] font-bold text-muted-foreground shadow-fantasy-sm backdrop-blur-sm active:scale-95"
          >
            {t("common.back")}
          </Link>
        </div>

        <div className="relative mt-3 flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, -4, 4, 0], y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface/90 text-3xl shadow-fantasy"
            aria-hidden
          >
            🕵️
          </motion.div>
          <div className="min-w-0 text-start">
            <h1 className="font-display text-2xl font-black leading-tight text-foreground">
              {t("mystery.title")}
            </h1>
            <p className="mt-0.5 font-display text-sm font-bold text-muted-foreground">
              {t("mystery.subtitle")}
            </p>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <StatPill
            icon="🎯"
            label={t("mystery.guessesLabel")}
            value={`${toLocaleDigits(mystery.guessCount, locale)}/${toLocaleDigits(mystery.maxGuesses, locale)}`}
            accent="primary"
          />
          <StatPill
            icon="🔥"
            label={t("mystery.streakLabel")}
            value={toLocaleDigits(mystery.mysteryStreak, locale)}
            accent="accent"
          />
        </div>

        {!done && (
          <div className="relative mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: mystery.maxGuesses }).map((_, i) => {
              const used = i < mystery.guessCount;
              const next = i === mystery.guessCount;
              return (
                <motion.span
                  key={i}
                  animate={next ? { scale: [1, 1.2, 1] } : undefined}
                  transition={
                    next
                      ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                      : undefined
                  }
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    used
                      ? "bg-secondary shadow-[0_0_8px_rgba(255,90,54,0.45)]"
                      : next
                        ? "bg-primary ring-2 ring-primary/40"
                        : "bg-muted-foreground/25",
                  ].join(" ")}
                />
              );
            })}
            <span className="ms-2 font-display text-[10px] font-bold text-muted-foreground">
              {toLocaleDigits(remaining, locale)}{" "}
              {t("mystery.guessesLabel").toLowerCase()}
            </span>
          </div>
        )}
      </motion.header>

      {/* ── How to play ──────────────────────────────────────── */}
      {!done && (
        <div className="overflow-hidden rounded-bubble-lg bg-linear-to-br from-primary/12 via-surface to-secondary/10 shadow-fantasy-sm">
          <button
            type="button"
            onClick={() => {
              playSound("click");
              setHowOpen((v) => !v);
            }}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start"
          >
            <span className="inline-flex items-center gap-2 font-display text-sm font-extrabold text-foreground">
              <span aria-hidden>📖</span>
              {t("mystery.howToTitle")}
            </span>
            <span className="font-display text-xs font-bold text-primary">
              {howOpen ? "▴" : "▾"}
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
                <div className="space-y-2 px-3.5 pb-3.5 text-start">
                  <p className="font-body text-sm font-semibold leading-relaxed text-foreground/85">
                    {t("mystery.howToBody")}
                  </p>
                  <p className="rounded-2xl bg-muted/60 px-3 py-2 font-display text-[11px] font-bold leading-snug text-muted-foreground">
                    {t("mystery.howToTip")}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
      <div className="flex flex-col gap-2">
        {mystery.guesses.length === 0 && !done ? (
          <div className="flex flex-col items-center gap-2 rounded-bubble-lg bg-muted/25 px-4 py-8 text-center shadow-fantasy-sm">
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

      <div className="rounded-bubble bg-surface/80 px-3 py-2.5 shadow-fantasy-sm">
        <p className="mb-2 text-center font-display text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {t("mystery.legendTitle")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <LegendChip tone="correct" label={t("mystery.legendCorrect")} />
          <LegendChip tone="close" label={t("mystery.legendClose")} />
          <LegendChip tone="wrong" label={t("mystery.legendWrong")} />
          <LegendChip tone="dir" label={`▲ ${t("mystery.legendHigher")}`} />
          <LegendChip tone="dir" label={`▼ ${t("mystery.legendLower")}`} />
        </div>
      </div>

      {!done && (
        <div
          aria-hidden
          className="h-[calc(11.5rem+theme(spacing.nav)+env(safe-area-inset-bottom,0px))] shrink-0"
        />
      )}

      {/* Sticky dock — no thick accent border (shadow + fill only) */}
      {!done && (
        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-mobile px-4 pb-[calc(theme(spacing.nav)+env(safe-area-inset-bottom,0px))] pt-2"
        >
          <div className="pointer-events-auto rounded-t-bubble-lg bg-background/95 px-1 pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.1)] backdrop-blur-md">
            <p className="mb-2 text-center font-display text-[11px] font-bold text-muted-foreground">
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
              className="min-h-11 w-full rounded-2xl bg-surface px-3 font-display text-sm font-bold outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/40"
            />
            <ul className="mt-2 max-h-36 overflow-y-auto rounded-2xl bg-surface ring-1 ring-border/70">
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-center font-display text-xs font-bold text-muted-foreground">
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
                            : "hover:bg-muted/50",
                        ].join(" ")}
                      >
                        <span>{label}</span>
                        <span className="text-[11px] text-muted-foreground">
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
                "btn-fantasy mt-2.5 mb-1 w-full min-h-touch justify-center",
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

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: "primary" | "accent";
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-2xl px-3 py-2 shadow-fantasy-sm",
        accent === "primary" ? "bg-primary/12" : "bg-accent/18",
      ].join(" ")}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 text-start">
        <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={[
            "font-display text-lg font-black tabular-nums leading-none",
            accent === "primary" ? "text-primary" : "text-accent-deep",
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function LegendChip({
  tone,
  label,
}: {
  tone: "correct" | "close" | "wrong" | "dir";
  label: string;
}) {
  const bg =
    tone === "correct"
      ? "bg-emerald-500/25 text-emerald-900"
      : tone === "close"
        ? "bg-amber-400/25 text-amber-950"
        : tone === "wrong"
          ? "bg-destructive/15 text-destructive"
          : "bg-sky-500/20 text-sky-950";
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 font-display text-[10px] font-extrabold",
        bg,
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
    hint?: string;
  }[] = [
    { key: "n", label: t("mystery.colNation"), v: guess.nationality },
    { key: "p", label: t("mystery.colPos"), v: guess.position },
    { key: "l", label: t("mystery.colLeague"), v: guess.league },
    { key: "c", label: t("mystery.colClub"), v: guess.club },
    {
      key: "a",
      label: t("mystery.colAge"),
      v: guess.age,
      hint: guess.age === "higher" ? "▲" : guess.age === "lower" ? "▼" : "✓",
    },
    {
      key: "s",
      label: t("mystery.colShirt"),
      v: guess.shirtNumber,
      hint:
        guess.shirtNumber === "higher"
          ? "▲"
          : guess.shirtNumber === "lower"
            ? "▼"
            : "✓",
    },
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
        "rounded-bubble-lg p-3 shadow-fantasy",
        guess.isCorrect
          ? "bg-linear-to-br from-emerald-500/20 to-surface"
          : "bg-linear-to-br from-surface to-muted/35",
      ].join(" ")}
    >
      <p className="mb-2 flex items-center gap-2 font-display text-sm font-extrabold text-foreground">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-display text-[11px] font-black text-muted-foreground"
          aria-hidden
        >
          {toLocaleDigits(index + 1, locale)}
        </span>
        {name}
        {guess.isCorrect && (
          <span className="ms-auto text-base" aria-hidden>
            ⚽
          </span>
        )}
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {cells.map((c) => (
          <div
            key={c.key}
            title={verdictLabel(c.v, t)}
            className={[
              "flex flex-col items-center rounded-xl px-1 py-1.5 text-center ring-1",
              verdictClass(c.v),
            ].join(" ")}
          >
            <span className="text-[9px] font-bold uppercase opacity-80">
              {c.label}
            </span>
            <span className="font-display text-xs font-black">
              {c.hint ??
                (c.v === "correct" ? "✓" : c.v === "close" ? "~" : "×")}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
