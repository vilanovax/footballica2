"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  GameIconWell,
  GamePanel,
  GameTile,
} from "@/components/ui/game";

const Confetti = dynamic(() =>
  import("./Confetti").then((m) => m.Confetti),
);
import { fansSoftCap } from "@/lib/club/upgradeEffects";
import { staminaRegenIntervalMinutes } from "@/lib/club/stamina";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { cn } from "@/lib/utils";

type StadiumHeroProps = {
  stadiumLevel: number;
  fans: number;
  trainingGroundLevel: number;
  medicalLevel: number;
  maxStamina: number;
  celebrateKey: number;
  celebrating: boolean;
};

/** Visual tiers — dark game wash + stadium art treatment (not emoji scenes). */
const TIER_SCENE = [
  {
    rim: "border-stone-500/50",
    wash: "from-[#1c1917] via-[#44403c] to-[#0c0a09]",
    glow: "bg-stone-400/20",
    art: "grayscale brightness-75 contrast-110",
    tip: "🪨",
  },
  {
    rim: "border-amber-600/45",
    wash: "from-[#3d2a08] via-[#7a5410] to-[#1c1408]",
    glow: "bg-amber-400/25",
    art: "sepia-[.35] brightness-90 contrast-105",
    tip: "🚧",
  },
  {
    rim: "border-emerald-400/45",
    wash: "from-[#052e16] via-[#14532d] to-[#022c22]",
    glow: "bg-emerald-400/30",
    art: "brightness-100 saturate-110",
    tip: "🌱",
  },
  {
    rim: "border-sky-300/50",
    wash: "from-[#0c2d4a] via-[#134e75] to-[#0a281c]",
    glow: "bg-sky-300/35",
    art: "brightness-110 saturate-125 drop-shadow-[0_0_18px_rgba(125,211,252,0.45)]",
    tip: "💡",
  },
] as const;

/** Crowd seats lit by fan fill (0…18 dots). */
function crowdCountFor(fans: number, cap: number): number {
  const fill = Math.min(1, Math.max(0, fans / Math.max(1, cap)));
  return Math.max(2, Math.min(18, Math.round(2 + fill * 16)));
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
  const tierIndex = Math.min(
    Math.max(0, stadiumLevel),
    TIER_SCENE.length - 1,
  );
  const scene = TIER_SCENE[tierIndex]!;
  const cap = fansSoftCap(stadiumLevel);
  const crowdN = crowdCountFor(fans, cap);
  const fillPct = Math.min(100, Math.round((fans / Math.max(1, cap)) * 100));
  const regenMinutes = staminaRegenIntervalMinutes(medicalLevel);
  const floodlit = stadiumLevel >= 3;

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
        className={[
          "relative aspect-16/11 w-full overflow-hidden rounded-bubble-xl border-[3px] text-start shadow-[0_6px_0_0_rgba(0,0,0,0.32)] transition-transform active:translate-y-px active:shadow-[0_4px_0_0_rgba(0,0,0,0.32)]",
          scene.rim,
        ].join(" ")}
      >
        <div
          className={["absolute inset-0 bg-linear-to-br", scene.wash].join(" ")}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 12px, #fff 12px, #fff 13px)",
          }}
          aria-hidden
        />
        <motion.div
          aria-hidden
          className={[
            "pointer-events-none absolute -end-10 top-0 h-36 w-36 rounded-full blur-3xl",
            scene.glow,
          ].join(" ")}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 3.2, repeat: Infinity }}
        />

        {/* Floodlight beams — level 3+ */}
        {floodlit && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute start-[12%] top-0 h-[55%] w-10 origin-top bg-linear-to-b from-sky-200/35 to-transparent"
              style={{ transform: "skewX(-12deg)" }}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute end-[12%] top-0 h-[55%] w-10 origin-top bg-linear-to-b from-sky-200/35 to-transparent"
              style={{ transform: "skewX(12deg)" }}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: 0.35 }}
            />
            <span
              className="absolute start-3 top-2 h-2.5 w-8 rounded-sm bg-sky-100/90 shadow-[0_0_12px_rgba(186,230,253,0.9)]"
              aria-hidden
            />
            <span
              className="absolute end-3 top-2 h-2.5 w-8 rounded-sm bg-sky-100/90 shadow-[0_0_12px_rgba(186,230,253,0.9)]"
              aria-hidden
            />
          </>
        )}

        {/* Stadium art — tier filter treatment */}
        <div className="absolute inset-x-0 top-[6%] flex justify-center">
          <motion.div
            className="relative"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/stadium.png"
              alt=""
              draggable={false}
              className={[
                "h-[7.25rem] w-auto max-w-[72%] object-contain sm:h-32",
                scene.art,
              ].join(" ")}
            />
          </motion.div>
        </div>

        {/* Crowd seats — CSS dots in stands, density from fans */}
        <div
          className="absolute inset-x-[18%] top-[38%] z-[1] flex flex-wrap justify-center gap-1 px-1"
          aria-hidden
        >
          {Array.from({ length: crowdN }).map((_, i) => (
            <motion.span
              key={`${crowdN}-${i}`}
              className={[
                "inline-block h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2",
                floodlit
                  ? "bg-sky-200/90"
                  : stadiumLevel >= 2
                    ? "bg-emerald-200/85"
                    : stadiumLevel >= 1
                      ? "bg-amber-200/80"
                      : "bg-stone-300/70",
              ].join(" ")}
              style={{ opacity: 0.45 + (i / crowdN) * 0.5 }}
              animate={{ opacity: [0.4, 0.95, 0.4] }}
              transition={{
                repeat: Infinity,
                duration: 1.4 + (i % 5) * 0.2,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>

        {/* Pitch strip */}
        <div
          className={[
            "absolute inset-x-0 bottom-0 h-[42%]",
            stadiumLevel >= 2
              ? "bg-linear-to-b from-[#166534] to-[#052e16]"
              : stadiumLevel >= 1
                ? "bg-linear-to-b from-[#92400e] to-[#451a03]"
                : "bg-linear-to-b from-[#57534e] to-[#1c1917]",
          ].join(" ")}
          aria-hidden
        >
          <div className="absolute inset-0 flex flex-col justify-evenly opacity-40">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={
                  i % 2 === 0 ? "h-full bg-white/10" : "h-full bg-transparent"
                }
              />
            ))}
          </div>
          <div className="absolute left-1/2 top-[42%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35" />
          <div className="absolute left-1/2 top-[42%] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
        </div>

        <FacilityBadge
          iconSrc="/icons/training.png"
          label={t("stadium.badgeTraining", {
            n: toLocaleDigits(trainingGroundLevel, locale),
          })}
          side="start"
          level={trainingGroundLevel}
          pulse={celebrating}
        />
        <FacilityBadge
          iconSrc="/icons/medical.png"
          label={t("stadium.badgeMedical", {
            n: toLocaleDigits(regenMinutes, locale),
          })}
          side="end"
          level={medicalLevel}
          pulse={celebrating}
        />

        {/* Bottom HUD */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/85 via-black/55 to-transparent px-3 pb-2.5 pt-10">
          <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15">
            <motion.div
              className={[
                "h-full rounded-full",
                fillPct >= 90
                  ? "bg-linear-to-r from-amber-400 to-orange-400"
                  : "bg-linear-to-r from-emerald-400 to-lime-300",
              ].join(" ")}
              initial={false}
              animate={{ width: `${fillPct}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            />
          </div>
          <p className="font-display text-[11px] font-black text-white/90">
            {scene.tip} {t("stadium.lvl")}{" "}
            {toLocaleDigits(stadiumLevel, locale)} ·{" "}
            {t(`stadium.tiers.${tierIndex}`)}
          </p>
          <p className="mt-0.5 font-display text-sm font-black text-white">
            {toLocaleDigits(fans, locale)}
            <span className="text-white/45">
              /{toLocaleDigits(cap, locale)}
            </span>{" "}
            {t("stadium.fans")}
            <span className="ms-1.5 text-[11px] font-bold text-amber-200/90">
              {toLocaleDigits(fillPct, locale)}%
            </span>
          </p>
          <p className="mt-0.5 font-display text-[10px] font-bold text-white/55">
            ⚡ {toLocaleDigits(maxStamina, locale)} ·{" "}
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
        subtitle={`${t("stadium.lvl")} ${toLocaleDigits(stadiumLevel, locale)} · ${t(`stadium.tiers.${tierIndex}`)}`}
        closeLabel={t("common.close")}
        tone="dark"
      >
        <GamePanel className="-mx-1" tone="emerald">
          <div className="relative flex items-center gap-3 px-3 py-3.5">
            <GameIconWell
              size="lg"
              amber
              src="/icons/stadium.png"
              className="h-16 w-16"
              iconClassName={cn("h-12 w-12", scene.art)}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {Array.from({ length: 4 }, (_, i) => (
                  <span
                    key={i}
                    className={[
                      "h-2 w-2 rounded-full",
                      i < stadiumLevel
                        ? "bg-accent shadow-[0_0_6px_hsl(var(--accent))]"
                        : "bg-white/15",
                    ].join(" ")}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mt-1.5 font-display text-sm font-black text-white">
                {toLocaleDigits(fans, locale)}
                <span className="text-white/50">
                  /{toLocaleDigits(cap, locale)}
                </span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
                <motion.div
                  className={[
                    "h-full rounded-full",
                    fillPct >= 90
                      ? "bg-linear-to-r from-amber-400 to-orange-400"
                      : "bg-linear-to-r from-emerald-400 to-lime-300",
                  ].join(" ")}
                  initial={false}
                  animate={{ width: `${fillPct}%` }}
                />
              </div>
              <p className="mt-1 font-display text-[10px] font-bold text-white/55">
                {t("stadium.crowdFill")} ·{" "}
                <span dir="ltr" className="tabular-nums text-amber-200">
                  {toLocaleDigits(fillPct, locale)}%
                </span>
              </p>
            </div>
          </div>
        </GamePanel>

        <ul className="mt-3 flex flex-col gap-2">
          <FacilityRow
            iconSrc="/icons/stadium.png"
            label={t("stadium.statStadium")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(stadiumLevel, locale)}`}
            hot={stadiumLevel >= 3}
          />
          <FacilityRow
            iconSrc="/icons/training.png"
            label={t("stadium.statTraining")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(trainingGroundLevel, locale)}`}
            subIconSrc="/icons/energy.png"
            sub={toLocaleDigits(maxStamina, locale)}
          />
          <FacilityRow
            iconSrc="/icons/medical.png"
            label={t("stadium.statMedical")}
            value={`${t("stadium.lvl")} ${toLocaleDigits(medicalLevel, locale)}`}
            sub={t("stadium.regenEvery", {
              n: toLocaleDigits(regenMinutes, locale),
            })}
          />
        </ul>

        <p className="mt-3 text-center font-display text-[11px] font-bold text-white/40">
          {t("stadium.tapUpgradesHint")}
        </p>
      </BottomSheet>
    </>
  );
}

function FacilityBadge({
  iconSrc,
  label,
  side,
  level,
  pulse,
}: {
  iconSrc: string;
  label: string;
  side: "start" | "end";
  level: number;
  pulse: boolean;
}) {
  const grown = level > 0;
  return (
    <motion.div
      className={[
        "absolute bottom-[44%] z-10 flex items-center gap-1 rounded-xl border-2 px-1.5 py-1 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
        side === "start" ? "start-2" : "end-2",
        grown
          ? "border-white/25 bg-black/55"
          : "border-white/10 bg-black/40 opacity-70",
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        draggable={false}
        className={[
          "object-contain",
          grown ? "h-5 w-5" : "h-4 w-4 opacity-70",
        ].join(" ")}
      />
      <span className="font-display text-[9px] font-extrabold leading-none text-white">
        {label}
      </span>
    </motion.div>
  );
}

function FacilityRow({
  iconSrc,
  label,
  value,
  sub,
  subIconSrc,
  hot,
}: {
  iconSrc: string;
  label: string;
  value: string;
  sub?: string;
  subIconSrc?: string;
  hot?: boolean;
}) {
  return (
    <li>
      <GameTile
        tone={hot ? "amber" : "default"}
        className="flex items-center gap-3 px-3 py-2.5"
      >
        <GameIconWell size="sm" src={iconSrc} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-bold text-white/55">
            {label}
          </p>
          <p
            className={cn(
              "font-display text-base font-black",
              hot ? "text-amber-200" : "text-white",
            )}
          >
            {value}
            {sub ? (
              <span className="ms-1.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-white/55">
                ·{" "}
                {subIconSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={subIconSrc}
                    alt=""
                    aria-hidden
                    className="inline h-3.5 w-3.5 object-contain"
                  />
                ) : null}
                {sub}
              </span>
            ) : null}
          </p>
        </div>
      </GameTile>
    </li>
  );
}
