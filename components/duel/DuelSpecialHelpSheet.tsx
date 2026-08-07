"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { LiveModeId } from "@/lib/game/economy";
import { LIVE_MODE_LABELS } from "@/lib/game/liveModes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type DuelSpecialHelpSheetProps = {
  mode: LiveModeId | null;
  open: boolean;
  onClose: () => void;
  tone?: "default" | "dark";
};

type TFn = ReturnType<typeof useTranslation>["t"];

/**
 * Compact how-to sheet for duel specials — scannable, not a wall of text.
 */
export function DuelSpecialHelpSheet({
  mode,
  open,
  onClose,
  tone = "dark",
}: DuelSpecialHelpSheetProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  if (!mode) return null;

  const title =
    locale === "fa" ? LIVE_MODE_LABELS[mode].fa : LIVE_MODE_LABELS[mode].en;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={t("duel.help.howToPlay")}
      closeLabel={t("common.close")}
      tone={tone}
    >
      {mode === "tikiTaka" ? (
        <TikiHelpBody
          t={t}
          reduceMotion={Boolean(reduceMotion)}
          onClose={onClose}
        />
      ) : (
        <SimpleHelpBody mode={mode} t={t} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function TikiHelpBody({
  t,
  reduceMotion,
  onClose,
}: {
  t: TFn;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const rules: { icon: string; text: string; accent: string }[] = [
    {
      icon: "/icons/target.png",
      text: t("duel.help.tikiTaka.r1"),
      accent: "shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)] bg-sky-500/15",
    },
    {
      icon: "/icons/timer.png",
      text: t("duel.help.tikiTaka.r2"),
      accent:
        "shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)] bg-emerald-500/15",
    },
    {
      icon: "/icons/claim.png",
      text: t("duel.help.tikiTaka.r3"),
      accent: "shadow-[inset_0_0_0_1px_rgba(251,191,36,0.4)] bg-amber-500/15",
    },
    {
      icon: "/icons/trophy.png",
      text: t("duel.help.tikiTaka.r4"),
      accent: "shadow-[inset_0_0_0_1px_rgba(251,191,36,0.45)] bg-amber-400/15",
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Hero pitch — teaches the board at a glance */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#0a1f14] via-[#0f172a] to-[#052e16] p-3 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_4px_0_0_rgba(0,0,0,0.35)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
        />
        <div className="absolute -inset-s-10 top-0 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl" />
        <div className="absolute -inset-e-8 bottom-0 h-24 w-24 rounded-full bg-sky-400/10 blur-2xl" />

        <div className="relative mb-3 flex items-start gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/35 bg-black/40 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/target.png"
              alt=""
              draggable={false}
              className="h-6 w-6 object-contain"
            />
          </span>
          <p className="min-w-0 pt-0.5 font-display text-sm font-extrabold leading-snug text-white">
            {t("duel.help.tikiTaka.pitch")}
          </p>
        </div>

        <MiniTikiBoard reduceMotion={reduceMotion} />

        <div className="relative mt-3 flex items-center justify-center gap-4">
          <Swatch
            className="bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.55)]"
            label={t("duel.tiki.you")}
          />
          <Swatch className="bg-white/30" label={t("duel.tiki.open")} />
          <Swatch
            className="bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.45)]"
            label={t("duel.tiki.them")}
          />
        </div>
      </div>

      {/* Tip chip */}
      <div className="flex items-center gap-2.5 rounded-xl bg-amber-400/12 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/streak.png"
          alt=""
          draggable={false}
          className="h-5 w-5 shrink-0 object-contain"
        />
        <p className="font-display text-xs font-extrabold leading-snug text-amber-200">
          {t("duel.help.tikiTaka.tip")}
        </p>
      </div>

      {/* Rules */}
      <ul className="flex flex-col gap-2">
        {rules.map((r, i) => (
          <motion.li
            key={r.text}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.22 }}
            className="flex min-h-12 items-center gap-3 rounded-2xl bg-black/35 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
          >
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                r.accent,
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.icon}
                alt=""
                draggable={false}
                className="h-6 w-6 object-contain"
              />
            </span>
            <span className="min-w-0 flex-1 font-display text-sm font-bold leading-snug text-white/90">
              {r.text}
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/6 font-display text-[10px] font-black tabular-nums text-white/35">
              {i + 1}
            </span>
          </motion.li>
        ))}
      </ul>

      <GotItButton t={t} onClose={onClose} />
    </div>
  );
}

function MiniTikiBoard({ reduceMotion }: { reduceMotion: boolean }) {
  // Diagonal win for you — teaches 3-in-a-row at a glance.
  const cells: ("you" | "them" | "open")[] = [
    "you",
    "open",
    "them",
    "open",
    "you",
    "open",
    "them",
    "open",
    "you",
  ];
  const winIdx = new Set([0, 4, 8]);

  return (
    <div
      className="relative mx-auto grid w-48 grid-cols-3 gap-1.5 rounded-xl bg-black/30 p-2 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.2)]"
      aria-hidden
    >
      {cells.map((kind, i) => {
        const isWin = winIdx.has(i) && kind === "you";
        return (
          <motion.div
            key={i}
            initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.03 * i,
              type: "spring",
              stiffness: 380,
              damping: 22,
            }}
            className={[
              "relative flex h-11 items-center justify-center rounded-xl font-display text-sm font-black",
              kind === "you"
                ? "bg-linear-to-br from-sky-500/55 to-blue-800/40 text-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.55),0_0_12px_rgba(56,189,248,0.28)]"
                : kind === "them"
                  ? "bg-linear-to-br from-rose-500/55 to-red-900/40 text-rose-50 shadow-[0_0_0_1px_rgba(251,113,133,0.5)]"
                  : "bg-white/4 text-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
              isWin
                ? "shadow-[0_0_0_2px_rgba(251,191,36,0.7),0_0_14px_rgba(251,191,36,0.35)]"
                : "",
            ].join(" ")}
          >
            {kind === "open" ? (
              <span className="text-base font-black text-white/25">+</span>
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
            )}
            {isWin && (
              <motion.span
                className="pointer-events-none absolute inset-0 rounded-xl bg-amber-300/15"
                animate={
                  reduceMotion ? undefined : { opacity: [0.2, 0.55, 0.2] }
                }
                transition={{ repeat: Infinity, duration: 1.3 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function SimpleHelpBody({
  mode,
  t,
  onClose,
}: {
  mode: LiveModeId;
  t: TFn;
  onClose: () => void;
}) {
  const lines =
    mode === "memory"
      ? [
          t("duel.help.memory.r1"),
          t("duel.help.memory.r2"),
          t("duel.help.memory.r3"),
        ]
      : [t("duel.help.generic.s1Body"), t("duel.help.generic.s2Body")];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center font-display text-sm font-bold text-white/85">
        {mode === "memory"
          ? t("duel.help.memory.pitch")
          : t("duel.help.generic.s1Title")}
      </p>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li
            key={line}
            className="rounded-2xl bg-black/35 px-3 py-3 text-center font-display text-sm font-bold text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
          >
            {line}
          </li>
        ))}
      </ul>
      {mode === "memory" && (
        <p className="text-center font-display text-xs font-extrabold text-amber-300/95">
          {t("duel.help.memory.tip")}
        </p>
      )}
      <GotItButton t={t} onClose={onClose} />
    </div>
  );
}

function GotItButton({ t, onClose }: { t: TFn; onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        playSound("click");
        haptic(HAPTIC.tap);
        onClose();
      }}
      className="game-cta game-cta-primary mt-0.5 min-h-12 w-full"
    >
      {t("duel.help.gotIt")}
    </button>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-[10px] font-extrabold uppercase tracking-wide text-white/55">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
