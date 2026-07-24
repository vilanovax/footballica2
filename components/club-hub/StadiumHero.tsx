"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Confetti } from "./Confetti";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { fansSoftCap } from "@/lib/club/upgradeEffects";
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
        className="relative aspect-[16/11] w-full overflow-hidden rounded-bubble-xl border border-border text-start shadow-fantasy-lg transition-transform active:scale-[0.99]"
      >
        <div className={`absolute inset-0 bg-gradient-to-b ${tier.sky}`} />

        {stadiumLevel >= 3 && (
          <>
            <span className="absolute left-4 top-3 text-2xl drop-shadow">💡</span>
            <span className="absolute right-4 top-3 text-2xl drop-shadow">💡</span>
          </>
        )}

        <div className="absolute inset-x-0 top-[14%] flex justify-center gap-1 text-lg opacity-80">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i}>{stadiumLevel >= 2 ? "🧑‍🤝‍🧑" : "👤"}</span>
          ))}
        </div>

        <div
          className={`absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-b ${tier.pitch}`}
        >
          <div className="absolute inset-0 flex flex-col justify-evenly">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-1/2 ${i % 2 === 0 ? tier.stripe : ""}`}
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
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-8">
          <p className="font-display text-xs font-bold text-white/95">
            {tier.props} {t("stadium.lvl")}{" "}
            {toLocaleDigits(stadiumLevel, locale)} ·{" "}
            {t(`stadium.tiers.${tierIndex}`)}
          </p>
          <p className="mt-0.5 font-display text-sm font-bold text-white">
            👥 {toLocaleDigits(fans, locale)}/{toLocaleDigits(cap, locale)}{" "}
            {t("stadium.fans")}
          </p>
        </div>

        {celebrating && (
          <div
            key={celebrateKey}
            className="stadium-sweep pointer-events-none absolute inset-0 z-20"
          />
        )}
        <AnimatePresence>
          {celebrating && <Confetti key={celebrateKey} />}
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
            value={`${toLocaleDigits(fans, locale)} / ${toLocaleDigits(cap, locale)}`}
          />
          <StatRow
            label={t("stadium.statTraining")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(trainingGroundLevel, locale)} · ⚡${toLocaleDigits(maxStamina, locale)}`}
          />
          <StatRow
            label={t("stadium.statMedical")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(medicalLevel, locale)}`}
          />
        </ul>
        <p className="mt-4 font-body text-xs font-semibold leading-relaxed text-muted-foreground">
          {t("stadium.sheetHint")}
        </p>
      </BottomSheet>
    </>
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
