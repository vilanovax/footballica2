"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { DuelCategoryOption } from "@/lib/duel/types";
import { DEFAULT_GAME_CONFIG, type LiveModeId } from "@/lib/game/economy";
import { LIVE_MODE_LABELS } from "@/lib/game/liveModes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { DuelSpecialHelpSheet } from "@/components/duel/DuelSpecialHelpSheet";
import {
  GameChip,
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";
import { cn } from "@/lib/utils";

type DraftPickerProps = {
  options: DuelCategoryOption[];
  /** @deprecated Prefer specialAvailable */
  memoryAvailable?: boolean;
  /** Admin-enabled specials still pickable this turn. */
  specialAvailable?: LiveModeId[];
  pending?: boolean;
  onPick: (categoryId: string) => void;
  onPickMemory?: () => void;
  onPickSpecial?: (mode: LiveModeId) => void;
};

/** Accent themes per quiz slot — Arena dark chrome accents. */
const WEAPON_THEMES = [
  {
    ring: "ring-orange-400/70",
    glow: "from-orange-500/25 via-amber-400/8 to-transparent",
    badge: "bg-orange-500 text-white",
    iconBg: "bg-orange-500/20 ring-orange-400/45",
    bar: "bg-orange-500",
    cta: "bg-orange-500/25 text-orange-100",
    panel: "amber" as const,
  },
  {
    ring: "ring-sky-400/70",
    glow: "from-sky-500/25 via-teal-400/8 to-transparent",
    badge: "bg-sky-500 text-white",
    iconBg: "bg-sky-500/20 ring-sky-400/45",
    bar: "bg-sky-500",
    cta: "bg-sky-500/25 text-sky-100",
    panel: "sky" as const,
  },
  {
    ring: "ring-emerald-400/70",
    glow: "from-emerald-500/25 via-lime-400/8 to-transparent",
    badge: "bg-emerald-500 text-white",
    iconBg: "bg-emerald-500/20 ring-emerald-400/45",
    bar: "bg-emerald-500",
    cta: "bg-emerald-500/25 text-emerald-100",
    panel: "emerald" as const,
  },
  {
    ring: "ring-amber-400/70",
    glow: "from-amber-500/25 via-yellow-400/8 to-transparent",
    badge: "bg-amber-500 text-amber-950",
    iconBg: "bg-amber-500/20 ring-amber-400/45",
    bar: "bg-amber-500",
    cta: "bg-amber-500/25 text-amber-100",
    panel: "amber" as const,
  },
] as const;

const SPECIAL_META: Record<
  LiveModeId,
  { pickId: string; icon: string; accent: string }
> = {
  memory: {
    pickId: "__memory__",
    icon: "🃏",
    accent: "rose",
  },
  mystery: {
    pickId: "__mystery__",
    icon: "🕵️",
    accent: "sky",
  },
  grid: {
    pickId: "__grid__",
    icon: "▦",
    accent: "emerald",
  },
  starPath: {
    pickId: "__star_path__",
    icon: "⭐",
    accent: "amber",
  },
  tikiTaka: {
    pickId: "__tiki_taka__",
    icon: "⨯",
    accent: "sky",
  },
};

/**
 * Attack loadout — special formats (once) + quiz banks.
 */
export function DraftPicker({
  options,
  memoryAvailable = false,
  specialAvailable,
  pending,
  onPick,
  onPickMemory,
  onPickSpecial,
}: DraftPickerProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [helpMode, setHelpMode] = useState<LiveModeId | null>(null);
  const shots = DEFAULT_GAME_CONFIG.duel.questionsPerAttack;
  const pairs = DEFAULT_GAME_CONFIG.duel.memoryPairs;
  const busy = Boolean(pending || pickedId);
  const specials: LiveModeId[] = (
    specialAvailable && specialAvailable.length > 0
      ? specialAvailable
      : memoryAvailable
        ? (["memory"] as LiveModeId[])
        : []
  ).filter((mode) => Boolean(SPECIAL_META[mode]));
  const hasSpecials = specials.length > 0;

  return (
    <>
    <section className="game-sheet relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-bubble-xl">
      {/* Arena atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="game-sheet-wash absolute inset-x-0 top-0 h-40" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-orange-500/20 to-transparent" />
        <div className="absolute -start-16 top-1/3 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -end-12 bottom-1/4 h-44 w-44 rounded-full bg-emerald-400/12 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 px-3 pb-4 pt-4">
        {/* ── Header: readable step + rules ───────────────────────── */}
        <header className="shrink-0 text-center">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 font-display text-xs font-extrabold text-accent-foreground shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-accent-foreground"
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
            {hasSpecials ? t("duel.draftSubWithMemory") : t("duel.draftSub")}
          </p>

          <div className="mx-auto mt-3.5 flex max-w-sm flex-wrap items-stretch justify-center gap-2">
            <RulePill
              icon="🎯"
              label={t("duel.draftRuleQuiz", {
                n: toLocaleDigits(shots, locale),
              })}
            />
            {hasSpecials && (
              <RulePill icon="✨" label={t("duel.draftRuleMemory")} highlight />
            )}
            <RulePill icon="🔒" label={t("duel.draftRuleLock")} />
          </div>
        </header>

        {/* ── Options ─────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-1">
          {hasSpecials && (
            <div className="flex flex-col gap-2">
              <p className="px-0.5 text-start font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-rose-200/90">
                {t("duel.draftSectionSpecial")}
              </p>
              {specials.map((mode) => {
                const meta = SPECIAL_META[mode];
                const label =
                  locale === "fa"
                    ? LIVE_MODE_LABELS[mode].fa
                    : LIVE_MODE_LABELS[mode].en;
                const selected = pickedId === meta.pickId;
                return (
                  <motion.div
                    key={mode}
                    initial={reduceMotion ? false : { y: 14, opacity: 0 }}
                    animate={{
                      y: 0,
                      opacity: busy && !selected ? 0.4 : 1,
                      scale: selected ? 1.015 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <GamePanel
                      tone="rose"
                      className={cn(
                        "flex min-h-[5.25rem] items-stretch",
                        selected && "ring-2 ring-arena-amber",
                      )}
                    >
                    <motion.button
                      type="button"
                      disabled={busy}
                      whileTap={busy ? undefined : { scale: 0.985 }}
                      onClick={() => {
                        if (busy) return;
                        setPickedId(meta.pickId);
                        haptic(HAPTIC.tap);
                        playSound("click");
                        if (mode === "memory" && onPickMemory) onPickMemory();
                        else onPickSpecial?.(mode);
                      }}
                      className="relative flex min-h-[5.25rem] min-w-0 flex-1 items-center gap-3 p-3.5 text-start disabled:cursor-wait"
                    >
                      <GameIconWell size="lg" className="text-2xl">
                        {meta.icon}
                      </GameIconWell>
                      <span className="relative z-10 min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg font-black text-white">
                            {selected ? t("duel.draftLocking") : label}
                          </span>
                          <GameChip tone="amber" className="uppercase tracking-wide">
                            {t("duel.draftMemoryOnce")}
                          </GameChip>
                        </span>
                        {mode === "memory" && (
                          <span className="mt-1 block font-body text-sm font-bold text-white/70">
                            {t("duel.draftMemoryPairs", {
                              n: toLocaleDigits(pairs, locale),
                            })}
                          </span>
                        )}
                        {mode === "tikiTaka" && (
                          <span className="mt-1 block font-body text-sm font-bold text-white/70">
                            {t("duel.draftTikiBlurb")}
                          </span>
                        )}
                      </span>
                    </motion.button>

                    <button
                      type="button"
                      disabled={busy}
                      aria-label={t("duel.help.howToPlay")}
                      onClick={() => {
                        playSound("click");
                        haptic(HAPTIC.tap);
                        setHelpMode(mode);
                      }}
                      className="relative flex w-14 shrink-0 items-center justify-center border-s border-white/15 bg-black/25 active:scale-95 disabled:opacity-40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/help.png"
                        alt=""
                        draggable={false}
                        className="h-9 w-9 object-contain"
                      />
                    </button>
                    </GamePanel>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(hasSpecials || options.length > 0) && (
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
                    className="group w-full text-start disabled:cursor-wait"
                  >
                    <GamePanel
                      tone={theme.panel}
                      className={cn(
                        "flex min-h-[5.25rem] items-center gap-3 p-3.5",
                        selected && `ring-2 ${theme.ring}`,
                      )}
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
                      <span className="block truncate font-display text-lg font-black text-white">
                        {selected ? t("duel.draftLocking") : name}
                      </span>
                      <span className="mt-1 block font-body text-sm font-bold text-white/65">
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
                          : "bg-black/50 text-white ring-1 ring-white/20",
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
                        className="pointer-events-none absolute inset-0 rounded-bubble-xl ring-4 ring-arena-amber"
                      />
                    )}
                    </GamePanel>
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

    <DuelSpecialHelpSheet
      mode={helpMode}
      open={helpMode != null}
      onClose={() => setHelpMode(null)}
      tone="dark"
    />
    </>
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
    <GameChip
      tone={highlight ? "amber" : "default"}
      className="min-h-9 px-3 py-1.5 text-xs font-extrabold"
    >
      <span aria-hidden className="text-sm leading-none">
        {icon}
      </span>
      {label}
    </GameChip>
  );
}
