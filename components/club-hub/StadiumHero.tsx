"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Confetti } from "./Confetti";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { fansSoftCap } from "@/lib/club/upgradeEffects";
import { staminaRegenIntervalMinutes } from "@/lib/club/stamina";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type StadiumHeroProps = {
  stadiumLevel: number;
  fans: number;
  trainingGroundLevel: number;
  medicalLevel: number;
  maxStamina: number;
  celebrateKey: number;
  celebrating: boolean;
};

type Tier = {
  sky: string;
  pitch: string;
  stripe: string;
  props: string;
};

const TIERS: Tier[] = [
  {
    sky: "from-stone-700 via-stone-600 to-amber-900/40",
    pitch: "from-amber-800 to-yellow-900",
    stripe: "bg-amber-700/40",
    props: "🪨",
  },
  {
    sky: "from-orange-300 via-amber-200 to-amber-100",
    pitch: "from-amber-700 to-orange-800",
    stripe: "bg-orange-600/40",
    props: "🚧",
  },
  {
    sky: "from-sky-400 via-sky-300 to-emerald-100",
    pitch: "from-green-600 to-emerald-800",
    stripe: "bg-green-500/40",
    props: "🌱",
  },
  {
    sky: "from-indigo-500 via-sky-500 to-emerald-300",
    pitch: "from-green-500 to-emerald-700",
    stripe: "bg-green-400/50",
    props: "💡",
  },
];

/** Crowd size scales with fan fill of soft cap (1…12). */
function crowdCountFor(fans: number, cap: number): number {
  const fill = Math.min(1, Math.max(0, fans / Math.max(1, cap)));
  return Math.max(1, Math.min(12, Math.round(1 + fill * 11)));
}

function trainingProp(level: number): string {
  if (level <= 0) return "cone";
  if (level === 1) return "🏃";
  if (level === 2) return "🏋️";
  return "🎯";
}

function medicalProp(level: number): string {
  if (level <= 0) return "🩹";
  if (level === 1) return "💊";
  if (level === 2) return "🏥";
  return "⚕️";
}

export function StadiumHero({
  stadiumLevel,
  fans,
  trainingGroundLevel,
  medicalLevel,
  maxStamina,
  celebrateKey,
  celebrating,
}: StadiumHeroProps) {
  const { t, locale } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const tierIndex = Math.min(stadiumLevel, TIERS.length - 1);
  const tier = TIERS[tierIndex]!;
  const cap = fansSoftCap(stadiumLevel);
  const crowdN = crowdCountFor(fans, cap);
  const fillPct = Math.min(100, Math.round((fans / Math.max(1, cap)) * 100));
  const trainEmoji = trainingProp(trainingGroundLevel);
  const medEmoji = medicalProp(medicalLevel);
  const regenMinutes = staminaRegenIntervalMinutes(medicalLevel);

  function openSheet() {
    haptic(HAPTIC.tap);
    playSound("click");
    setSheetOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={t("stadium.openDetails")}
        className="relative aspect-16/11 w-full overflow-hidden rounded-bubble-xl border border-border text-start shadow-fantasy-lg transition-transform active:scale-[0.99]"
      >
        {/* Sky — slow breathing gradient */}
        <motion.div
          className={`absolute inset-0 bg-linear-to-b ${tier.sky}`}
          animate={{ opacity: [1, 0.92, 1] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />

        {/* Soft cloud drift */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -start-8 top-[8%] h-10 w-28 rounded-full bg-white/15 blur-md"
          animate={{ x: [0, 40, 0] }}
          transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute end-4 top-[18%] h-8 w-20 rounded-full bg-white/10 blur-md"
          animate={{ x: [0, -28, 0] }}
          transition={{
            repeat: Infinity,
            duration: 11,
            ease: "easeInOut",
            delay: 1.2,
          }}
        />

        {stadiumLevel >= 3 ? (
          <>
            <motion.span
              className="absolute start-4 top-3 text-2xl drop-shadow"
              animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.4 }}
              aria-hidden
            >
              💡
            </motion.span>
            <motion.span
              className="absolute end-4 top-3 text-2xl drop-shadow"
              animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: 0.4 }}
              aria-hidden
            >
              💡
            </motion.span>
          </>
        ) : null}

        {/* Crowd — density from fans */}
        <div
          className="absolute inset-x-0 top-[12%] flex justify-center gap-0.5 px-2 text-base sm:text-lg"
          aria-hidden
        >
          {Array.from({ length: crowdN }).map((_, i) => (
            <motion.span
              key={`${crowdN}-${i}`}
              className="inline-block drop-shadow-sm"
              style={{ opacity: 0.55 + (i / crowdN) * 0.45 }}
              animate={{ y: [0, -3, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.6 + (i % 4) * 0.25,
                delay: i * 0.08,
                ease: "easeInOut",
              }}
            >
              {stadiumLevel >= 2 ? "🧑‍🤝‍🧑" : "👤"}
            </motion.span>
          ))}
        </div>

        {/* Pitch */}
        <div
          className={`absolute inset-x-0 bottom-0 h-[58%] bg-linear-to-b ${tier.pitch}`}
        >
          <div className="absolute inset-0 flex flex-col justify-evenly overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-1/2 ${i % 2 === 0 ? tier.stripe : ""}`}
                animate={
                  i % 2 === 0
                    ? { opacity: [0.55, 0.85, 0.55] }
                    : undefined
                }
                transition={
                  i % 2 === 0
                    ? { repeat: Infinity, duration: 5, ease: "easeInOut" }
                    : undefined
                }
              />
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
          <motion.span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
            animate={{ y: [0, -6, 0], rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            aria-hidden
          >
            ⚽️
          </motion.span>

          {/* Training ground — left sideline */}
          <FacilityBadge
            emoji={trainEmoji === "cone" ? "🚧" : trainEmoji}
            iconSrc="/icons/training.png"
            label={t("stadium.badgeTraining", {
              n: toLocaleDigits(trainingGroundLevel, locale),
            })}
            side="start"
            level={trainingGroundLevel}
            pulse={celebrating}
          />

          {/* Medical bay — right sideline */}
          <FacilityBadge
            emoji={medEmoji}
            iconSrc="/icons/medical.png"
            label={t("stadium.badgeMedical", {
              n: toLocaleDigits(regenMinutes, locale),
            })}
            side="end"
            level={medicalLevel}
            pulse={celebrating}
          />
        </div>

        {/* Fan fill meter */}
        <div className="absolute inset-x-3 top-[42%] z-10 h-1 overflow-hidden rounded-full bg-black/25">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-amber-200 to-primary"
            initial={false}
            animate={{ width: `${fillPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-3 pb-3 pt-8">
          <p className="font-display text-xs font-bold text-white/95">
            {tier.props} {t("stadium.lvl")}{" "}
            {toLocaleDigits(stadiumLevel, locale)} ·{" "}
            {t(`stadium.tiers.${tierIndex}`)}
          </p>
          <p className="mt-0.5 font-display text-sm font-bold text-white">
            👥 {toLocaleDigits(fans, locale)}/{toLocaleDigits(cap, locale)}{" "}
            {t("stadium.fans")}
            <span className="ms-1.5 text-[11px] font-semibold text-white/70">
              ({toLocaleDigits(fillPct, locale)}%)
            </span>
          </p>
          <p className="mt-0.5 font-body text-[10px] font-semibold text-white/75">
            ⚡ {toLocaleDigits(maxStamina, locale)} {t("stadium.maxEnergy")} ·{" "}
            {t("stadium.regenEvery", {
              n: toLocaleDigits(regenMinutes, locale),
            })}{" "}
            · {t("stadium.tapDetails")}
          </p>
        </div>

        {celebrating ? (
          <div
            key={celebrateKey}
            className="stadium-sweep pointer-events-none absolute inset-0 z-20"
          />
        ) : null}
        <AnimatePresence>
          {celebrating ? <Confetti key={celebrateKey} /> : null}
        </AnimatePresence>
      </button>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("stadium.sheetTitle")}
        subtitle={t(`stadium.tiers.${tierIndex}`)}
        closeLabel={t("common.close")}
        tone="dark"
      >
        {/* Stage — matches Club Business facility sheets */}
        <div
          className={[
            "relative -mx-1 mb-4 overflow-hidden rounded-bubble-xl border border-white/15 bg-gradient-to-br shadow-[0_8px_0_0_rgba(0,0,0,0.35)]",
            tierIndex >= 3
              ? "from-[#0c2d4a] via-[#134e75] to-[#1a7a55]"
              : tierIndex >= 2
                ? "from-[#14532d] via-[#166534] to-[#15803d]"
                : tierIndex >= 1
                  ? "from-[#3d2a08] via-[#7a5410] to-[#a16207]"
                  : "from-[#292524] via-[#44403c] to-[#57534e]",
          ].join(" ")}
        >
          <div
            className="pointer-events-none absolute -start-8 top-0 h-32 w-32 rounded-full bg-emerald-400/30 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -end-6 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-12deg, transparent, transparent 12px, #fff 12px, #fff 13px)",
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center px-4 pb-5 pt-6">
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/25 bg-black/25 text-5xl shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              animate={{ y: [0, -6, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.8,
                ease: "easeInOut",
              }}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/stadium.png"
                alt=""
                draggable={false}
                className="h-14 w-14 object-contain drop-shadow-md"
              />
            </motion.div>

            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: 4 }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "h-2.5 w-2.5 rounded-full border border-white/30",
                    i < stadiumLevel
                      ? "bg-emerald-400 shadow-[0_0_8px_currentColor]"
                      : "bg-white/10",
                  ].join(" ")}
                  aria-hidden
                />
              ))}
            </div>

            <span className="mt-2 rounded-full bg-accent px-3 py-1 font-display text-xs font-black uppercase tracking-wide text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]">
              {tier.props}{" "}
              {t("stadium.lvl")} {toLocaleDigits(stadiumLevel, locale)} ·{" "}
              {t(`stadium.tiers.${tierIndex}`)}
            </span>
          </div>
        </div>

        <p className="text-center font-body text-sm font-semibold leading-relaxed text-white/65">
          {t("stadium.sheetHint")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <GameStat
            emoji="🏟️"
            label={t("stadium.statStadium")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(stadiumLevel, locale)}`}
          />
          <GameStat
            emoji="👥"
            label={t("stadium.statFans")}
            value={`${toLocaleDigits(fans, locale)}/${toLocaleDigits(cap, locale)}`}
            hot={fillPct >= 90}
          />
          <GameStat
            emoji="🏃"
            label={t("stadium.statTraining")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(trainingGroundLevel, locale)}`}
            sub={`⚡ ${toLocaleDigits(maxStamina, locale)}`}
          />
          <GameStat
            emoji="🏥"
            label={t("stadium.statMedical")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(medicalLevel, locale)}`}
            sub={t("stadium.regenEvery", {
              n: toLocaleDigits(regenMinutes, locale),
            })}
          />
        </div>

        {/* Fan fill meter */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between font-display text-[11px] font-bold text-white/55">
            <span>{t("stadium.crowdFill")}</span>
            <span dir="ltr" className="tabular-nums text-accent">
              {toLocaleDigits(fillPct, locale)}%
            </span>
          </div>
          <div className="relative h-4 overflow-hidden rounded-full border-2 border-white/15 bg-black/40 shadow-inner">
            <motion.div
              className={[
                "absolute inset-y-0 start-0 rounded-full",
                fillPct >= 90
                  ? "bg-gradient-to-r from-amber-400 to-orange-400"
                  : "bg-gradient-to-r from-emerald-400 to-lime-300",
              ].join(" ")}
              initial={false}
              animate={{ width: `${fillPct}%` }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
            />
            {fillPct > 8 && fillPct < 100 && (
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                animate={{ opacity: [0.15, 0.55, 0.15] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.4,
                  ease: "easeInOut",
                }}
                aria-hidden
              />
            )}
          </div>
          <p className="mt-2 text-center font-display text-[11px] font-bold text-white/45">
            {t("stadium.tapUpgradesHint")}
          </p>
        </div>
      </BottomSheet>
    </>
  );
}

function FacilityBadge({
  emoji,
  iconSrc,
  label,
  side,
  level,
  pulse,
}: {
  emoji: string;
  iconSrc?: string;
  label: string;
  side: "start" | "end";
  level: number;
  pulse: boolean;
}) {
  const grown = level > 0;
  return (
    <motion.div
      className={[
        "absolute bottom-3 z-10 flex items-center gap-1 rounded-xl border px-1.5 py-1 shadow-md backdrop-blur-sm",
        side === "start" ? "start-2" : "end-2",
        grown
          ? "border-white/50 bg-white/90"
          : "border-white/25 bg-black/35",
      ].join(" ")}
      animate={
        pulse
          ? { scale: [1, 1.12, 1] }
          : grown
            ? { y: [0, -2, 0] }
            : undefined
      }
      transition={
        pulse
          ? { duration: 0.5 }
          : grown
            ? { repeat: Infinity, duration: 2.8, ease: "easeInOut" }
            : undefined
      }
      aria-hidden
    >
      {iconSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconSrc}
          alt=""
          draggable={false}
          className={[
            "object-contain",
            grown ? "h-5 w-5" : "h-4 w-4 opacity-70",
          ].join(" ")}
        />
      ) : (
        <span className={grown ? "text-base" : "text-sm opacity-70"}>
          {emoji}
        </span>
      )}
      <span
        className={[
          "font-display text-[9px] font-extrabold leading-none",
          grown ? "text-slate-800" : "text-white/80",
        ].join(" ")}
      >
        {label}
      </span>
    </motion.div>
  );
}

function GameStat({
  emoji,
  label,
  value,
  sub,
  hot,
}: {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
  hot?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-bubble-lg border-2 px-3 py-2.5 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
        hot
          ? "border-amber-400/70 bg-amber-500/20"
          : "border-white/12 bg-white/8",
      ].join(" ")}
    >
      <p className="flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-white/50">
        <span aria-hidden>{emoji}</span>
        {label}
      </p>
      <p
        dir="ltr"
        className={[
          "mt-1 font-display text-lg font-black tabular-nums tracking-tight",
          hot ? "text-amber-300" : "text-white",
        ].join(" ")}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 font-display text-[11px] font-bold text-white/55">
          {sub}
        </p>
      ) : null}
    </div>
  );
}
