"use client";

import { useMemo, useState, useTransition } from "react";
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
} from "@/lib/mystery/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { MysteryShareCard } from "@/components/mystery/MysteryShareCard";
import { BadgeUnlockPopup } from "@/components/quiz/BadgeUnlockPopup";
import { GotdResultModal } from "@/components/play/GotdResultModal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { GotdRewardsPayload } from "@/lib/game/gotdRewards";

type Props = {
  initial: DailyMysterySnapshot;
};

const ATTR_KEYS = ["n", "p", "l", "c", "a", "s"] as const;

/** Solid Wordle-style tiles — pop hard on dark Game UI. */
function verdictStyle(v: AttributeVerdict | CompareVerdict): {
  tile: string;
  glyph: string;
} {
  if (v === "correct")
    return {
      tile: "bg-emerald-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),0_2px_0_0_rgba(0,0,0,0.25)]",
      glyph: "✓",
    };
  if (v === "close")
    return {
      tile: "bg-amber-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),0_2px_0_0_rgba(0,0,0,0.25)]",
      glyph: "~",
    };
  if (v === "higher")
    return {
      tile: "bg-sky-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),0_2px_0_0_rgba(0,0,0,0.25)]",
      glyph: "▲",
    };
  if (v === "lower")
    return {
      tile: "bg-sky-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),0_2px_0_0_rgba(0,0,0,0.25)]",
      glyph: "▼",
    };
  return {
    tile: "bg-rose-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),0_2px_0_0_rgba(0,0,0,0.25)]",
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
  const [howOpen, setHowOpen] = useState(false);
  const [rewards, setRewards] = useState<GotdRewardsPayload | null>(null);
  const [previousStreak, setPreviousStreak] = useState(0);
  const [showResult, setShowResult] = useState(
    initial.status === "SOLVED" || initial.status === "FAILED",
  );

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

  const attrLabels = useMemo(
    () => [
      t("mystery.colNation"),
      t("mystery.colPos"),
      t("mystery.colLeague"),
      t("mystery.colClub"),
      t("mystery.colAge"),
      t("mystery.colShirt"),
    ],
    [t],
  );

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
      if (res.unlockedBadges.length > 0) {
        setUnlockedBadges(res.unlockedBadges);
      }
      if (res.rewards) setRewards(res.rewards);
      setPreviousStreak(res.previousStreak);
      const last = res.mystery.guesses[res.mystery.guesses.length - 1];
      if (last?.isCorrect) {
        playSound("goal");
        haptic(HAPTIC.tap);
        window.setTimeout(() => setShowResult(true), 380);
      } else if (res.mystery.status === "FAILED") {
        playSound("miss");
        haptic(HAPTIC.miss);
        window.setTimeout(() => setShowResult(true), 380);
      } else {
        playSound("click");
        haptic(HAPTIC.light);
      }
    });
  }

  async function copyShare() {
    if (!mystery.shareCode) return;
    try {
      await navigator.clipboard.writeText(mystery.shareCode);
      toast.success(t("mystery.shared"));
      playSound("click");
    } catch {
      toast.error(t("mystery.errGeneric"));
    }
  }

  const answerName =
    locale === "fa" ? mystery.answer?.nameFa : mystery.answer?.nameEn;
  const canLock = Boolean(selectedId) && !pending;

  return (
    <section className="relative -mx-4 flex min-h-0 flex-1 flex-col gap-2.5 bg-[#071510] px-4 pb-2 text-white">
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
        <div className="absolute -end-16 top-0 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -start-20 top-36 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      {/* ── Compact header ───────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 overflow-hidden rounded-2xl bg-linear-to-br from-[#052e16] via-[#0f172a] to-[#052e16] px-2.5 py-2 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_4px_0_0_rgba(0,0,0,0.35)]"
      >
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
              src="/icons/mystery.png"
              alt=""
              draggable={false}
              className="h-8 w-8 object-contain"
            />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-black leading-tight text-white">
              {t("mystery.title")}
            </h1>
            <p className="truncate font-display text-[10px] font-bold text-white/50">
              {t("mystery.subtitle")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span className="inline-flex items-center gap-0.5 rounded-xl bg-black/40 px-1.5 py-1 font-display text-xs font-black tabular-nums text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/guesses.png"
                alt=""
                aria-hidden
                draggable={false}
                className="h-5 w-5 object-contain"
              />
              {toLocaleDigits(mystery.guessCount, locale)}/
              {toLocaleDigits(mystery.maxGuesses, locale)}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-xl bg-black/40 px-1.5 py-1 font-display text-xs font-black tabular-nums text-amber-200 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.3)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/streak.png"
                alt=""
                aria-hidden
                draggable={false}
                className="h-5 w-5 object-contain"
              />
              {toLocaleDigits(mystery.mysteryStreak, locale)}
            </span>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setHowOpen(true);
              }}
              aria-label={t("mystery.howToTitle")}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_3px_0_0_rgba(0,0,0,0.35)] transition-transform active:scale-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/help-gold.png"
                alt=""
                draggable={false}
                className="h-7 w-7 object-contain"
              />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Attempt dots */}
      {!done && (
        <div
          className="relative z-10 flex items-center justify-center gap-1.5"
          aria-label={`${toLocaleDigits(remaining, locale)} ${t("mystery.guessesLabel")}`}
        >
          {Array.from({ length: mystery.maxGuesses }).map((_, i) => {
            const g = mystery.guesses[i];
            const next = i === mystery.guessCount;
            let tone = "h-2 w-2 bg-white/20";
            if (g?.isCorrect)
              tone =
                "h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]";
            else if (g)
              tone =
                "h-2 w-2 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
            else if (next)
              tone = "h-2.5 w-2.5 bg-emerald-200 ring-2 ring-emerald-300/40";
            return (
              <motion.span
                key={i}
                animate={next ? { scale: [1, 1.18, 1] } : undefined}
                transition={
                  next
                    ? { duration: 1.25, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
                className={["rounded-full", tone].join(" ")}
              />
            );
          })}
        </div>
      )}

      <BottomSheet
        open={howOpen}
        onClose={() => setHowOpen(false)}
        title={t("mystery.howToTitle")}
        subtitle={t("mystery.howToTip")}
        closeLabel={t("common.back")}
        tone="dark"
      >
        <div className="space-y-3 pb-2">
          <p className="font-display text-sm font-bold leading-relaxed text-white/80">
            {t("mystery.howToBody")}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <LegendChip tone="correct" label={t("mystery.legendCorrect")} />
            <LegendChip tone="close" label={t("mystery.legendClose")} />
            <LegendChip tone="wrong" label={t("mystery.legendWrong")} />
            <LegendChip
              tone="dir"
              label={`▲ ${t("mystery.legendHigher")}`}
            />
            <LegendChip
              tone="dir"
              label={`▼ ${t("mystery.legendLower")}`}
              className="col-span-2"
            />
          </div>
        </div>
      </BottomSheet>

      {done && mystery.shareCode && (
        <div className="relative z-10 flex flex-col gap-3">
          <p className="text-center font-display text-xl font-black text-white">
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
            className="flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-emerald-400/40 bg-linear-to-b from-emerald-500 to-emerald-800 font-display text-base font-black text-white shadow-[0_4px_0_0_rgba(0,0,0,0.4)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.4)]"
          >
            {t("mystery.backPlay")}
          </Link>
        </div>
      )}

      {unlockedBadges.length > 0 && !showResult && (
        <BadgeUnlockPopup
          badges={unlockedBadges}
          onClose={() => setUnlockedBadges([])}
        />
      )}

      <GotdResultModal
        open={showResult && done}
        outcome={mystery.status === "SOLVED" ? "SOLVED" : "FAILED"}
        kind="mystery"
        rewards={rewards}
        previousStreak={previousStreak}
        currentStreak={mystery.mysteryStreak}
        shareCode={mystery.shareCode}
        unlockedBadges={unlockedBadges}
        onShare={copyShare}
        onClose={() => setShowResult(false)}
      />

      {/* ── Anticipation grid — always 6 rows ─────────────────── */}
      {!done && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pb-1">
          {/* Column legend — spacer matches row index badge */}
          <div className="flex items-start gap-1.5 px-0.5">
            <span className="h-5 w-5 shrink-0" aria-hidden />
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
              {attrLabels.map((label) => (
                <span
                  key={label}
                  className="truncate text-center font-display text-[9px] font-black uppercase tracking-wide text-emerald-200/55"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {Array.from({ length: mystery.maxGuesses }).map((_, i) => {
            const guess = mystery.guesses[i];
            if (guess) {
              return (
                <GuessRow
                  key={`${guess.playerId}-${guess.at}`}
                  guess={guess}
                  index={i}
                />
              );
            }
            return (
              <EmptyGuessRow
                key={`empty-${i}`}
                index={i}
                isNext={i === mystery.guessCount}
              />
            );
          })}
        </div>
      )}

      {done && mystery.guesses.length > 0 && !mystery.shareCode && (
        <div className="relative z-10 flex flex-col gap-1.5">
          {mystery.guesses.map((g, i) => (
            <GuessRow key={`${g.playerId}-${g.at}`} guess={g} index={i} />
          ))}
        </div>
      )}

      {!done && <div aria-hidden className="h-52 shrink-0" />}

      {!done && (
        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-full max-w-mobile px-3 bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        >
          <div className="pointer-events-auto overflow-hidden rounded-t-[1.35rem] bg-linear-to-b from-[#0a1f14] via-[#0f172a] to-[#071510] px-2.5 pt-2.5 pb-2 shadow-[0_0_0_1px_rgba(52,211,153,0.3),0_-14px_36px_rgba(0,0,0,0.55)]">
            <div className="mb-2 flex justify-center">
              <span
                aria-hidden
                className="h-1 w-10 rounded-full bg-white/25"
              />
            </div>
            <p
              className={[
                "mb-1.5 text-center font-display text-[11px] font-black",
                selectedLabel ? "text-emerald-200" : "text-white/50",
              ].join(" ")}
            >
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
              className="min-h-11 w-full rounded-2xl bg-black/45 px-3 font-display text-sm font-bold text-white outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] placeholder:text-white/35 focus:shadow-[inset_0_0_0_2px_rgba(52,211,153,0.45)]"
            />
            <ul className="mt-1.5 max-h-28 overflow-y-auto rounded-2xl bg-black/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-center font-display text-xs font-bold text-white/40">
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
                          "flex w-full min-h-11 items-center justify-between gap-2 px-3 py-2 text-start font-display text-sm font-black",
                          active
                            ? "bg-emerald-500/25 text-emerald-100"
                            : "text-white/90 active:bg-white/8",
                        ].join(" ")}
                      >
                        <span className="truncate">{label}</span>
                        <span className="shrink-0 text-[11px] font-bold text-white/40">
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
              disabled={!canLock}
              whileTap={canLock ? { y: 2 } : undefined}
              onClick={onGuess}
              className={[
                "mt-2 flex w-full min-h-12 items-center justify-center rounded-2xl border-2 font-display text-base font-black transition-transform",
                canLock
                  ? "border-emerald-400/45 bg-linear-to-b from-emerald-500 to-emerald-800 text-white shadow-[0_4px_0_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.4)]"
                  : "border-white/10 bg-white/10 text-white/45",
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
        "flex min-h-10 items-center justify-center rounded-2xl px-2 py-1.5 text-center font-display text-[11px] font-black text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.22)]",
        bg,
        className ?? "",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function EmptyGuessRow({
  index,
  isNext,
}: {
  index: number;
  isNext: boolean;
}) {
  const { locale } = useTranslation();
  return (
    <div
      className={[
        "flex items-start gap-1.5 rounded-2xl px-1.5 py-1.5",
        isNext
          ? "bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.4),0_0_16px_rgba(52,211,153,0.12)]"
          : "bg-black/25 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-black",
          isNext
            ? "bg-emerald-400 text-emerald-950"
            : "bg-white/10 text-white/40",
        ].join(" ")}
      >
        {toLocaleDigits(index + 1, locale)}
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
        {ATTR_KEYS.map((key) => (
          <div
            key={key}
            className={[
              "flex min-h-11 items-center justify-center rounded-xl",
              isNext
                ? "bg-black/30 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]"
                : "bg-black/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                isNext ? "bg-emerald-300/70" : "bg-white/20",
              ].join(" ")}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
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
    value: string;
    v: AttributeVerdict | CompareVerdict;
  }[] = [
    {
      key: "n",
      value: guess.nationalityValue ?? t("mystery.colNation"),
      v: guess.nationality,
    },
    {
      key: "p",
      value: guess.positionValue ?? t("mystery.colPos"),
      v: guess.position,
    },
    {
      key: "l",
      value: guess.leagueValue ?? t("mystery.colLeague"),
      v: guess.league,
    },
    {
      key: "c",
      value: guess.clubValue ?? t("mystery.colClub"),
      v: guess.club,
    },
    {
      key: "a",
      value:
        guess.ageValue != null
          ? toLocaleDigits(guess.ageValue, locale)
          : t("mystery.colAge"),
      v: guess.age,
    },
    {
      key: "s",
      value:
        guess.shirtNumberValue != null
          ? toLocaleDigits(guess.shirtNumberValue, locale)
          : t("mystery.colShirt"),
      v: guess.shirtNumber,
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
        "rounded-2xl px-1.5 py-1.5 shadow-[0_3px_0_0_rgba(0,0,0,0.28)]",
        guess.isCorrect
          ? "bg-emerald-500/15 shadow-[0_0_0_1px_rgba(52,211,153,0.45),0_3px_0_0_rgba(0,0,0,0.28)]"
          : "bg-black/35 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_3px_0_0_rgba(0,0,0,0.28)]",
      ].join(" ")}
    >
      <p className="mb-1.5 flex items-center gap-1.5 font-display text-sm font-black text-white">
        <span
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-black",
            guess.isCorrect
              ? "bg-emerald-400 text-emerald-950"
              : "bg-white/90 text-[#0c1218]",
          ].join(" ")}
          aria-hidden
        >
          {toLocaleDigits(index + 1, locale)}
        </span>
        <span className="min-w-0 truncate">{name}</span>
        {guess.isCorrect && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/icons/trophy.png"
            alt=""
            aria-hidden
            draggable={false}
            className="ms-auto h-4 w-4 object-contain"
          />
        )}
      </p>
      <div className="flex items-start gap-1.5">
        <span className="w-5 shrink-0" aria-hidden />
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
          {cells.map((c) => {
            const style = verdictStyle(c.v);
            return (
              <div
                key={c.key}
                title={verdictLabel(c.v, t)}
                className={[
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-center",
                  style.tile,
                ].join(" ")}
              >
                <span className="line-clamp-2 font-display text-[10px] font-extrabold leading-tight tracking-wide text-white">
                  {c.value}
                </span>
                <span className="font-display text-xs font-black leading-none text-white/95">
                  {style.glyph}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
