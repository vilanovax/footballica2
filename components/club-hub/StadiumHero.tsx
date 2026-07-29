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
      >
        <ul className="flex flex-col gap-3">
          <StatRow
            label={t("stadium.statStadium")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(stadiumLevel, locale)}`}
          />
          <StatRow
            label={t("stadium.statFans")}
            value={`${toLocaleDigits(fans, locale)} / ${toLocaleDigits(cap, locale)} (${toLocaleDigits(fillPct, locale)}%)`}
          />
          <StatRow
            label={t("stadium.statTraining")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(trainingGroundLevel, locale)} · ⚡${toLocaleDigits(maxStamina, locale)}`}
          />
          <StatRow
            label={t("stadium.statMedical")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(medicalLevel, locale)} · ${t("stadium.regenEvery", { n: toLocaleDigits(regenMinutes, locale) })}`}
          />
        </ul>
        <p className="mt-4 font-body text-xs font-semibold leading-relaxed text-muted-foreground">
          {t("stadium.sheetHint")}
        </p>
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-bubble border border-border bg-muted/40 px-3 py-2.5">
      <span className="font-display text-sm font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-sm font-bold text-foreground">
        {value}
      </span>
    </li>
  );
}
