"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { DuelCategoryOption } from "@/lib/duel/types";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type DraftPickerProps = {
  options: DuelCategoryOption[];
  /** Offer Memory as a one-shot format (hidden once already used in the duel). */
  memoryAvailable?: boolean;
  pending?: boolean;
  onPick: (categoryId: string) => void;
  onPickMemory?: () => void;
};

/** Accent themes per quiz slot — pitch / kit colors, no violet cluster. */
const WEAPON_THEMES = [
  {
    ring: "ring-orange-400/70",
    glow: "from-orange-500/30 via-amber-400/8 to-transparent",
    badge: "bg-orange-500 text-white",
    iconBg: "bg-orange-500/15 ring-orange-400/45",
    bar: "bg-orange-500",
    cta: "bg-orange-500/15 text-orange-800",
  },
  {
    ring: "ring-sky-400/70",
    glow: "from-sky-500/30 via-teal-400/8 to-transparent",
    badge: "bg-sky-500 text-white",
    iconBg: "bg-sky-500/15 ring-sky-400/45",
    bar: "bg-sky-500",
    cta: "bg-sky-500/15 text-sky-900",
  },
  {
    ring: "ring-emerald-400/70",
    glow: "from-emerald-500/30 via-lime-400/8 to-transparent",
    badge: "bg-emerald-500 text-white",
    iconBg: "bg-emerald-500/15 ring-emerald-400/45",
    bar: "bg-emerald-500",
    cta: "bg-emerald-500/15 text-emerald-900",
  },
  {
    ring: "ring-amber-400/70",
    glow: "from-amber-500/30 via-yellow-400/8 to-transparent",
    badge: "bg-amber-500 text-amber-950",
    iconBg: "bg-amber-500/15 ring-amber-400/45",
    bar: "bg-amber-500",
    cta: "bg-amber-500/20 text-amber-950",
  },
] as const;

const MEMORY_PICK_ID = "__memory__";

/**
 * Attack loadout — clear step copy, featured Memory (once), then quiz banks.
 */
export function DraftPicker({
  options,
  memoryAvailable = false,
  pending,
  onPick,
  onPickMemory,
}: DraftPickerProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const shots = DEFAULT_GAME_CONFIG.duel.questionsPerAttack;
  const pairs = DEFAULT_GAME_CONFIG.duel.memoryPairs;
  const busy = Boolean(pending || pickedId);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-bubble-xl">
      {/* Arena atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-[#152029] via-[#101820] to-[#0a1016]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-orange-500/25 to-transparent" />
        <div className="absolute -inset-s-16 top-1/3 h-52 w-52 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -inset-e-12 bottom-1/4 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 px-3 pb-4 pt-4">
        {/* ── Header: readable step + rules ───────────────────────── */}
        <header className="shrink-0 text-center">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 font-display text-xs font-extrabold text-white shadow-lg shadow-orange-500/30"
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-white"
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [1, 0.4, 1], scale: [1, 1.25, 1] }
              }
              transition={{ repeat: Infinity, duration: 1.1 }}
            />
            {t("duel.draftStep")}
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="mt-3 font-display text-[1.65rem] font-black leading-tight text-white drop-shadow-md"
          >
            {t("duel.draftTitle")}
          </motion.h1>

          <p className="mx-auto mt-2 max-w-[20rem] font-body text-[0.95rem] font-bold leading-snug text-white/90">
            {memoryAvailable
              ? t("duel.draftSubWithMemory")
              : t("duel.draftSub")}
          </p>

          <div className="mx-auto mt-3.5 flex max-w-sm flex-wrap items-stretch justify-center gap-2">
            <RulePill
              icon="🎯"
              label={t("duel.draftRuleQuiz", {
                n: toLocaleDigits(shots, locale),
              })}
            />
            {memoryAvailable && (
              <RulePill icon="🃏" label={t("duel.draftRuleMemory")} highlight />
            )}
            <RulePill icon="🔒" label={t("duel.draftRuleLock")} />
          </div>
        </header>

        {/* ── Options ─────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-1">
          {memoryAvailable && onPickMemory && (
            <div className="flex flex-col gap-2">
              <p className="px-0.5 text-start font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-rose-200/90">
                {t("duel.draftSectionSpecial")}
              </p>
              <motion.button
                type="button"
                disabled={busy}
                initial={reduceMotion ? false : { y: 14, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: busy && pickedId !== MEMORY_PICK_ID ? 0.4 : 1,
                  scale: pickedId === MEMORY_PICK_ID ? 1.015 : 1,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                whileTap={busy ? undefined : { scale: 0.98 }}
                onClick={() => {
                  if (busy) return;
                  setPickedId(MEMORY_PICK_ID);
                  haptic(HAPTIC.tap);
                  playSound("click");
                  onPickMemory();
                }}
                className={[
                  "group relative flex min-h-[5.75rem] items-center gap-3 overflow-hidden rounded-2xl border-2 p-3.5 text-start shadow-[0_12px_32px_rgba(0,0,0,0.4)] disabled:cursor-wait",
                  pickedId === MEMORY_PICK_ID
                    ? "border-amber-300 bg-white ring-2 ring-rose-400/60"
                    : "border-rose-300/60 bg-linear-to-br from-rose-50 to-amber-50",
                ].join(" ")}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 start-0 w-1.5 bg-rose-500"
                />
                <span className="relative z-10 flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-2xl shadow-md ring-2 ring-rose-300/50">
                  🃏
                </span>
                <span className="relative z-10 min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-black text-slate-900">
                      {pickedId === MEMORY_PICK_ID
                        ? t("duel.draftLocking")
                        : t("duel.memory.title")}
                    </span>
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wide text-white">
                      {t("duel.draftMemoryOnce")}
                    </span>
                  </span>
                  <span className="mt-1 block font-body text-sm font-bold leading-snug text-slate-700">
                    {t("duel.draftMemoryHint")}
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 font-display text-xs font-extrabold text-rose-800">
                    <span>
                      {t("duel.draftMemoryPairs", {
                        n: toLocaleDigits(pairs, locale),
                      })}
                    </span>
                    <span className="text-rose-300" aria-hidden>
                      ·
                    </span>
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5">
                      {t("duel.draftMemoryCta")}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden
                  className={[
                    "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-xl font-black shadow-md",
                    pickedId === MEMORY_PICK_ID
                      ? "bg-amber-400 text-amber-950"
                      : "bg-rose-600 text-white",
                  ].join(" ")}
                >
                  {pickedId === MEMORY_PICK_ID
                    ? "✓"
                    : locale === "fa"
                      ? "‹"
                      : "›"}
                </span>
              </motion.button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(memoryAvailable || options.length > 0) && (
              <p className="px-0.5 text-start font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/70">
                {t("duel.draftSectionQuiz")}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {options.map((c, i) => {
                const name = locale === "fa" ? c.nameFa : c.nameEn;
                const theme = WEAPON_THEMES[i % WEAPON_THEMES.length]!;
                const selected = pickedId === c.id;
                const dimmed = busy && !selected;

                return (
                  <motion.button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    initial={reduceMotion ? false : { y: 14, opacity: 0 }}
                    animate={{
                      y: 0,
                      opacity: dimmed ? 0.4 : 1,
                      scale: selected ? 1.015 : 1,
                    }}
                    transition={{
                      delay: reduceMotion ? 0 : 0.04 + i * 0.05,
                      type: "spring",
                      stiffness: 320,
                      damping: 22,
                    }}
                    whileTap={busy ? undefined : { scale: 0.98 }}
                    onClick={() => {
                      if (busy) return;
                      setPickedId(c.id);
                      haptic(HAPTIC.tap);
                      playSound("click");
                      onPick(c.id);
                    }}
                    className={[
                      "group relative flex min-h-[5.25rem] items-center gap-3 overflow-hidden rounded-2xl border-2 p-3.5 text-start shadow-[0_10px_28px_rgba(0,0,0,0.35)] disabled:cursor-wait",
                      selected
                        ? `border-amber-300 bg-white ring-2 ${theme.ring}`
                        : "border-white/20 bg-white",
                    ].join(" ")}
                  >
                    <div
                      aria-hidden
                      className={[
                        "pointer-events-none absolute inset-y-0 start-0 w-1.5",
                        theme.bar,
                      ].join(" ")}
                    />
                    <div
                      aria-hidden
                      className={[
                        "pointer-events-none absolute inset-0 bg-linear-to-r opacity-70",
                        theme.glow,
                      ].join(" ")}
                    />

                    <span
                      className={[
                        "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-black shadow-md",
                        theme.badge,
                      ].join(" ")}
                    >
                      {toLocaleDigits(i + 1, locale)}
                    </span>

                    <span
                      className={[
                        "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ring-2 shadow-inner",
                        theme.iconBg,
                      ].join(" ")}
                    >
                      {c.icon || "⚽"}
                    </span>

                    <span className="relative z-10 min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-black text-slate-900">
                        {selected ? t("duel.draftLocking") : name}
                      </span>
                      <span className="mt-1 block font-body text-sm font-bold text-slate-600">
                        {t("duel.questions", {
                          n: toLocaleDigits(c.questionCount, locale),
                        })}
                      </span>
                      <span
                        className={[
                          "mt-1.5 inline-flex rounded-full px-2.5 py-0.5 font-display text-xs font-extrabold",
                          theme.cta,
                        ].join(" ")}
                      >
                        {t("duel.draftWeaponCta")}
                      </span>
                    </span>

                    <motion.span
                      aria-hidden
                      className={[
                        "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-xl font-black shadow-md",
                        selected
                          ? "bg-amber-400 text-amber-950"
                          : "bg-slate-900 text-white",
                      ].join(" ")}
                      animate={
                        selected && !reduceMotion
                          ? { rotate: [0, -10, 10, 0], scale: [1, 1.08, 1] }
                          : undefined
                      }
                      transition={{ duration: 0.4 }}
                    >
                      {selected ? "✓" : locale === "fa" ? "‹" : "›"}
                    </motion.span>

                    {selected && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.55, 0], scale: [1, 1.06] }}
                        transition={{ duration: 0.65 }}
                        className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-amber-300"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="shrink-0 text-center font-body text-xs font-bold leading-snug text-white/75">
          {t("duel.draftFooter")}
        </p>
      </div>
    </section>
  );
}

function RulePill({
  icon,
  label,
  highlight = false,
}: {
  icon: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-extrabold",
        highlight
          ? "bg-rose-500 text-white shadow-md shadow-rose-500/35"
          : "bg-white/14 text-white ring-1 ring-white/25",
      ].join(" ")}
    >
      <span aria-hidden className="text-sm leading-none">
        {icon}
      </span>
      {label}
    </span>
  );
}
