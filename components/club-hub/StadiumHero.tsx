"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Confetti } from "./Confetti";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type StadiumHeroProps = {
  stadiumLevel: number;
  /** Increment to retrigger the celebratory shine sweep + confetti. */
  celebrateKey: number;
  celebrating: boolean;
};

type Tier = {
  label: string;
  sky: string;
  pitch: string;
  stripe: string;
  props: string;
};

// Visual tiers: dirt → patchy → grass → floodlit arena.
const TIERS: Tier[] = [
  {
    label: "Ruined Ground",
    sky: "from-stone-700 via-stone-600 to-amber-900/40",
    pitch: "from-amber-800 to-yellow-900",
    stripe: "bg-amber-700/40",
    props: "🪨",
  },
  {
    label: "Dirt Pitch",
    sky: "from-orange-300 via-amber-200 to-amber-100",
    pitch: "from-amber-700 to-orange-800",
    stripe: "bg-orange-600/40",
    props: "🚧",
  },
  {
    label: "Grass Pitch",
    sky: "from-sky-400 via-sky-300 to-emerald-100",
    pitch: "from-green-600 to-emerald-800",
    stripe: "bg-green-500/40",
    props: "🌱",
  },
  {
    label: "Floodlit Arena",
    sky: "from-indigo-500 via-sky-500 to-emerald-300",
    pitch: "from-green-500 to-emerald-700",
    stripe: "bg-green-400/50",
    props: "💡",
  },
];

export function StadiumHero({
  stadiumLevel,
  celebrateKey,
  celebrating,
}: StadiumHeroProps) {
  const { t, locale } = useTranslation();
  const tierIndex = Math.min(stadiumLevel, TIERS.length - 1);
  const tier = TIERS[tierIndex];

  return (
    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-bubble-xl border border-border shadow-fantasy-lg">
      {/* Sky / stands */}
      <div className={`absolute inset-0 bg-gradient-to-b ${tier.sky}`} />

      {/* Floodlights for the top tier */}
      {stadiumLevel >= 3 && (
        <>
          <span className="absolute left-4 top-3 text-2xl drop-shadow">💡</span>
          <span className="absolute right-4 top-3 text-2xl drop-shadow">💡</span>
        </>
      )}

      {/* Crowd band */}
      <div className="absolute inset-x-0 top-[14%] flex justify-center gap-1 text-lg opacity-80">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i}>{stadiumLevel >= 2 ? "🧑‍🤝‍🧑" : "👤"}</span>
        ))}
      </div>

      {/* Pitch */}
      <div
        className={`absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-b ${tier.pitch}`}
      >
        {/* Mowing stripes */}
        <div className="absolute inset-0 flex flex-col justify-evenly">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-1/2 ${i % 2 === 0 ? tier.stripe : ""}`} />
          ))}
        </div>
        {/* Center circle + gently bobbing ball */}
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

      {/* Tier label */}
      <div className="absolute start-3 top-3 rounded-full bg-background/70 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-foreground backdrop-blur-sm">
        {tier.props} {t("stadium.lvl")} {toLocaleDigits(stadiumLevel, locale)} ·{" "}
        {t(`stadium.tiers.${tierIndex}`)}
      </div>

      {/* Celebratory shine sweep (retriggered via key) */}
      {celebrating && (
        <div
          key={celebrateKey}
          className="stadium-sweep pointer-events-none absolute inset-0 z-20"
        />
      )}

      <AnimatePresence>{celebrating && <Confetti key={celebrateKey} />}</AnimatePresence>
    </div>
  );
}
