"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  if (v === "correct") return "bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 ring-emerald-500/40";
  if (v === "close") return "bg-amber-400/25 text-amber-900 dark:text-amber-100 ring-amber-400/40";
  if (v === "higher" || v === "lower")
    return "bg-sky-500/20 text-sky-900 dark:text-sky-100 ring-sky-500/35";
  return "bg-destructive/15 text-destructive ring-destructive/30";
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

  const done = mystery.status === "SOLVED" || mystery.status === "FAILED";
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

  function onGuess() {
    if (!selectedId || pending || done) return;
    startTransition(async () => {
      const res = await submitMysteryGuess(selectedId);
      if (!res.ok) {
        haptic(HAPTIC.light);
        if (res.error === "duplicate_guess") toast.error(t("mystery.errDuplicate"));
        else if (res.error === "already_done") toast.error(t("mystery.errDone"));
        else toast.error(t("mystery.errGeneric"));
        return;
      }
      setMystery(res.mystery);
      setSelectedId(null);
      setQuery("");
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
    locale === "fa"
      ? mystery.answer?.nameFa
      : mystery.answer?.nameEn;

  return (
    <section className="flex flex-1 flex-col gap-4 pb-6">
      <header className="pt-2">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("play.gameOfTheDay")} · {mystery.dateKey}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
          {t("mystery.title")}
        </h1>
        <p className="mt-1 font-body text-sm font-semibold text-muted-foreground">
          {t("mystery.subtitle")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip>
            {t("mystery.guessesLeft", {
              cur: toLocaleDigits(mystery.guessCount, locale),
              max: toLocaleDigits(mystery.maxGuesses, locale),
            })}
          </Chip>
          <Chip>
            {t("mystery.streak", {
              n: toLocaleDigits(mystery.mysteryStreak, locale),
            })}
          </Chip>
        </div>
      </header>

      {done && mystery.shareCode && (
        <div className="flex flex-col gap-3">
          <p className="text-center font-display text-xl font-bold text-foreground">
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
            className="flex min-h-touch items-center justify-center rounded-bubble border border-border bg-muted font-display text-sm font-bold"
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

      <div className="flex flex-col gap-2">
        {mystery.guesses.map((g) => (
          <GuessRow key={`${g.playerId}-${g.at}`} guess={g} />
        ))}
      </div>

      {!done && (
        <div className="rounded-3xl border border-border bg-surface p-3 shadow-fantasy-sm">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId(null);
            }}
            placeholder={t("mystery.searchPlaceholder")}
            className="min-h-touch w-full rounded-2xl border border-border bg-muted/40 px-3 font-display text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
          />
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-border/60">
            {filtered.map((o) => {
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
                      active ? "bg-primary/15 text-primary" : "hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <span>{label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {o.club}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <motion.button
            type="button"
            disabled={!selectedId || pending}
            whileTap={!selectedId || pending ? undefined : { y: 3 }}
            onClick={onGuess}
            className={[
              "btn-fantasy mt-3 w-full min-h-touch",
              selectedId && !pending
                ? "btn-fantasy-primary"
                : "bg-muted text-muted-foreground opacity-60",
            ].join(" ")}
          >
            {pending ? "…" : t("mystery.guess")}
          </motion.button>
        </div>
      )}

      <p className="text-center font-body text-[11px] font-semibold text-muted-foreground">
        🟩 {t("mystery.legendCorrect")} · 🟨 {t("mystery.legendClose")} · 🟥{" "}
        {t("mystery.legendWrong")} · 🔼 {t("mystery.legendHigher")} · 🔽{" "}
        {t("mystery.legendLower")}
      </p>
    </section>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 font-display text-[11px] font-bold text-muted-foreground">
      {children}
    </span>
  );
}

function GuessRow({ guess }: { guess: MysteryGuessRecord }) {
  const { t, locale } = useTranslation();
  const name = locale === "fa" ? guess.nameFa : guess.nameEn;
  const cells: { key: string; label: string; v: AttributeVerdict | CompareVerdict; hint?: string }[] = [
    { key: "n", label: t("mystery.colNation"), v: guess.nationality },
    { key: "p", label: t("mystery.colPos"), v: guess.position },
    { key: "l", label: t("mystery.colLeague"), v: guess.league },
    { key: "c", label: t("mystery.colClub"), v: guess.club },
    {
      key: "a",
      label: t("mystery.colAge"),
      v: guess.age,
      hint: guess.age === "higher" ? "🔼" : guess.age === "lower" ? "🔽" : "✓",
    },
    {
      key: "s",
      label: t("mystery.colShirt"),
      v: guess.shirtNumber,
      hint:
        guess.shirtNumber === "higher"
          ? "🔼"
          : guess.shirtNumber === "lower"
            ? "🔽"
            : "✓",
    },
  ];

  return (
    <div
      className={[
        "rounded-2xl border bg-surface p-3 shadow-fantasy-sm",
        guess.isCorrect ? "border-emerald-500/50" : "border-border",
      ].join(" ")}
    >
      <p className="mb-2 font-display text-sm font-bold text-foreground">{name}</p>
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
              {c.hint ?? (c.v === "correct" ? "✓" : c.v === "close" ? "~" : "×")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
