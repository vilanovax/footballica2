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
        <TikiHelpBody t={t} reduceMotion={Boolean(reduceMotion)} onClose={onClose} />
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
  const rules = [
    { icon: "👆", text: t("duel.help.tikiTaka.r1") },
    { icon: "⏱", text: t("duel.help.tikiTaka.r2") },
    { icon: "🔓", text: t("duel.help.tikiTaka.r3") },
    { icon: "🏆", text: t("duel.help.tikiTaka.r4") },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Mini pitch — one glance teaches the board */}
      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#0a1410] p-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 22px, rgba(255,255,255,0.08) 22px 23px), repeating-linear-gradient(0deg, transparent 0 28px, rgba(255,255,255,0.05) 28px 29px)",
          }}
        />
        <p className="relative mb-3 text-center font-display text-sm font-extrabold text-white">
          {t("duel.help.tikiTaka.pitch")}
        </p>
        <MiniTikiBoard reduceMotion={reduceMotion} />
        <div className="relative mt-3 flex items-center justify-center gap-4">
          <Swatch className="bg-sky-400" label={t("duel.tiki.you")} />
          <Swatch className="bg-white/25" label={t("duel.tiki.open")} />
          <Swatch className="bg-rose-400" label={t("duel.tiki.them")} />
        </div>
      </div>

      {/* Short rules — one line each */}
      <ul className="flex flex-col gap-2">
        {rules.map((r, i) => (
          <motion.li
            key={r.text}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.22 }}
            className="flex min-h-12 items-center gap-3 rounded-2xl bg-white/6 px-3 py-2.5 ring-1 ring-white/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-lg ring-1 ring-sky-400/30">
              {r.icon}
            </span>
            <span className="font-display text-sm font-bold leading-snug text-white/90">
              {r.text}
            </span>
          </motion.li>
        ))}
      </ul>

      <p className="text-center font-display text-xs font-extrabold text-amber-300/95">
        {t("duel.help.tikiTaka.tip")}
      </p>

      <GotItButton t={t} onClose={onClose} />
    </div>
  );
}

function MiniTikiBoard({ reduceMotion }: { reduceMotion: boolean }) {
  // Demo ownership pattern: you / open / rival — shows steal + line idea.
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

  return (
    <div
      className="relative mx-auto grid w-[11.5rem] grid-cols-3 gap-1.5"
      aria-hidden
    >
      {cells.map((kind, i) => (
        <motion.div
          key={i}
          initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.03 * i, type: "spring", stiffness: 380, damping: 22 }}
          className={[
            "flex h-10 items-center justify-center rounded-xl border-2 font-display text-sm font-black",
            kind === "you"
              ? "border-sky-400/70 bg-sky-500/40 text-sky-50 shadow-[0_0_12px_rgba(56,189,248,0.35)]"
              : kind === "them"
                ? "border-rose-400/70 bg-rose-500/40 text-rose-50"
                : "border-dashed border-white/20 bg-white/5 text-white/30",
          ].join(" ")}
        >
          {kind === "open" ? "+" : kind === "you" ? "●" : "●"}
        </motion.div>
      ))}
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
            className="rounded-2xl bg-white/6 px-3 py-3 text-center font-display text-sm font-bold text-white/90 ring-1 ring-white/10"
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
      className="btn-fantasy-primary min-h-12 w-full"
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
