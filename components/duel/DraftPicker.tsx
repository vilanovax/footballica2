"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { DuelCategoryOption } from "@/lib/duel/types";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type DraftPickerProps = {
  options: DuelCategoryOption[];
  pending?: boolean;
  onPick: (categoryId: string) => void;
};

/** Accent themes per slot — keeps the arsenal reading as distinct weapons. */
const WEAPON_THEMES = [
  {
    ring: "ring-orange-400/70",
    glow: "from-orange-500/35 via-amber-400/10 to-transparent",
    badge: "bg-orange-500 text-white",
    iconBg: "bg-orange-500/20 ring-orange-400/50",
    bar: "bg-orange-400",
    cta: "text-orange-700",
  },
  {
    ring: "ring-sky-400/70",
    glow: "from-sky-500/35 via-cyan-400/10 to-transparent",
    badge: "bg-sky-500 text-white",
    iconBg: "bg-sky-500/20 ring-sky-400/50",
    bar: "bg-sky-400",
    cta: "text-sky-700",
  },
  {
    ring: "ring-emerald-400/70",
    glow: "from-emerald-500/35 via-teal-400/10 to-transparent",
    badge: "bg-emerald-500 text-white",
    iconBg: "bg-emerald-500/20 ring-emerald-400/50",
    bar: "bg-emerald-400",
    cta: "text-emerald-700",
  },
  {
    ring: "ring-violet-400/70",
    glow: "from-violet-500/35 via-fuchsia-400/10 to-transparent",
    badge: "bg-violet-500 text-white",
    iconBg: "bg-violet-500/20 ring-violet-400/50",
    bar: "bg-violet-400",
    cta: "text-violet-700",
  },
] as const;

/**
 * Attack loadout — pick the category weapon you'll fire at your rival.
 */
export function DraftPicker({ options, pending, onPick }: DraftPickerProps) {
  const { t, locale } = useTranslation();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const shots = DEFAULT_GAME_CONFIG.duel.questionsPerAttack;
  const busy = Boolean(pending || pickedId);

  return (
    <section className="relative flex min-h-[min(100%,34rem)] flex-1 flex-col overflow-hidden rounded-bubble-xl">
      {/* Arena atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-[#1c2433] via-[#141b26] to-[#0d1218]" />
        <div className="absolute inset-x-0 top-0 h-36 bg-linear-to-b from-orange-500/20 to-transparent" />
        <div className="absolute -inset-s-20 top-1/4 h-56 w-56 rounded-full bg-secondary/25 blur-3xl" />
        <div className="absolute -inset-e-16 bottom-1/5 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div
          className="absolute inset-x-8 top-[42%] h-28 -translate-y-1/2 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 16px, #fff 16px 17px)",
          }}
        />
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-amber-300/70"
            style={{
              left: `${20 + i * 18}%`,
              top: `${16 + (i % 2) * 12}%`,
            }}
            animate={{ y: [0, -10, 0], opacity: [0.25, 0.85, 0.25] }}
            transition={{
              repeat: Infinity,
              duration: 2 + i * 0.3,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-5 px-3 py-5">
        <header className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-3 py-1 font-display text-[11px] font-extrabold uppercase tracking-wider text-orange-200 ring-1 ring-orange-400/40"
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-orange-400"
              animate={{ scale: [1, 1.35, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
            {t("duel.eyebrow")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-3 font-display text-2xl font-black text-white drop-shadow-md"
          >
            {t("duel.draftTitle")}
          </motion.h1>
          <p className="mx-auto mt-1.5 max-w-xs font-body text-sm font-semibold text-white/60">
            {t("duel.draftSub")}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <InfoChip
              label={t("duel.draftShots", {
                n: toLocaleDigits(shots, locale),
              })}
            />
            <InfoChip label={t("duel.draftLockHint")} />
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-3">
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
                initial={{ y: 18, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: dimmed ? 0.45 : 1,
                  scale: selected ? 1.02 : 1,
                }}
                transition={{
                  delay: i * 0.07,
                  type: "spring",
                  stiffness: 320,
                  damping: 22,
                }}
                whileHover={busy ? undefined : { scale: 1.015 }}
                whileTap={busy ? undefined : { scale: 0.97 }}
                onClick={() => {
                  if (busy) return;
                  setPickedId(c.id);
                  haptic(HAPTIC.tap);
                  playSound("click");
                  onPick(c.id);
                }}
                className={[
                  "group relative flex min-h-[5.25rem] items-center gap-3 overflow-hidden rounded-2xl border-2 p-3.5 text-start shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-[border-color,box-shadow] disabled:cursor-wait",
                  selected
                    ? `border-amber-300 bg-white ring-2 ${theme.ring}`
                    : "border-white/15 bg-white/95 hover:border-white/40",
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
                    "pointer-events-none absolute inset-0 bg-linear-to-r opacity-80",
                    theme.glow,
                  ].join(" ")}
                />

                <span
                  className={[
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-black shadow-md",
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
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-body text-xs font-bold text-slate-500">
                    <span>
                      {t("duel.questions", {
                        n: toLocaleDigits(c.questionCount, locale),
                      })}
                    </span>
                    <span className="text-slate-300" aria-hidden>
                      ·
                    </span>
                    <span className={theme.cta}>
                      {t("duel.draftWeaponCta")}
                    </span>
                  </span>
                </span>

                <motion.span
                  aria-hidden
                  className={[
                    "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-black shadow-md",
                    selected
                      ? "bg-amber-400 text-amber-950"
                      : "bg-slate-900 text-white group-active:bg-slate-800",
                  ].join(" ")}
                  animate={
                    selected
                      ? { rotate: [0, -12, 12, 0], scale: [1, 1.1, 1] }
                      : { x: [0, 3, 0] }
                  }
                  transition={
                    selected
                      ? { duration: 0.45 }
                      : { repeat: Infinity, duration: 1.6, delay: i * 0.12 }
                  }
                >
                  {selected ? "✓" : locale === "fa" ? "‹" : "›"}
                </motion.span>

                {selected && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 0], scale: [1, 1.08] }}
                    transition={{ duration: 0.7 }}
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-amber-300"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-center font-body text-[11px] font-semibold text-white/40">
          {t("duel.draftFooter")}
        </p>
      </div>
    </section>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 font-display text-[11px] font-bold text-white/85 ring-1 ring-white/15">
      {label}
    </span>
  );
}
