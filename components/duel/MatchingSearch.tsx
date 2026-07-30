"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import { MANAGER_AVATARS, type AvatarKey } from "@/lib/onboarding/avatars";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

const SCAN_POOL: AvatarKey[] = MANAGER_AVATARS.map((a) => a.key);

/** Fake rival labels shown while scanning the pool (visual only). */
const SCAN_LABELS_EN = [
  "Rival FC",
  "Night Striker",
  "Pitch Ghost",
  "Cup Hunter",
  "Blue Bench",
  "Derby King",
  "Wing Wizard",
  "Last Whistle",
];
const SCAN_LABELS_FA = [
  "رقیب مرموز",
  "مهاجم شب",
  "شبح زمین",
  "شکارچی جام",
  "نیمکت آبی",
  "شاه دربی",
  "جادوگر بال",
  "آخرین سوت",
];

export const MATCHING_MIN_MS = 5_000;

type MatchingSearchProps = {
  yourAvatar: string | null | undefined;
  yourName?: string | null;
  /** True once the server matched a human or bot. */
  found?: boolean;
  foundIsBot?: boolean;
};

/**
 * Matchmaking stage — stadium atmosphere, radar VS, scanning rivals, stakes chips.
 */
export function MatchingSearch({
  yourAvatar,
  yourName,
  found = false,
  foundIsBot = false,
}: MatchingSearchProps) {
  const { t, locale } = useTranslation();
  const labels = locale === "fa" ? SCAN_LABELS_FA : SCAN_LABELS_EN;
  const weeklyXp = DEFAULT_GAME_CONFIG.duel.winWeeklyXp;
  const staminaCost = DEFAULT_GAME_CONFIG.duel.staminaCost;

  const scanKeys = useMemo(() => {
    const keys = [...SCAN_POOL];
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j]!, keys[i]!];
    }
    return keys;
  }, []);

  const [scanIndex, setScanIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (found) return;
    const id = window.setInterval(() => {
      setScanIndex((i) => (i + 1) % scanKeys.length);
    }, 420);
    return () => window.clearInterval(id);
  }, [found, scanKeys.length]);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const ms = performance.now() - started;
      setElapsedSec(Math.floor(ms / 1000));
      setProgress(Math.min(1, ms / MATCHING_MIN_MS));
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  const rivalKey = scanKeys[scanIndex] ?? "TACTICAL_COACH";
  const rivalLabel = labels[scanIndex % labels.length]!;
  const ring = 2 * Math.PI * 34;
  const dash = ring * (found ? 1 : progress);

  return (
    <section className="relative flex min-h-[min(100%,32rem)] flex-1 flex-col items-center justify-center overflow-hidden px-2 py-6 text-center">
      {/* Stadium atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-bubble-xl"
      >
        <div className="absolute inset-0 bg-linear-to-b from-[#1a2433] via-[#121820] to-[#0c1218]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-emerald-500/15 to-transparent" />
        <div className="absolute -inset-s-16 top-1/3 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -inset-e-12 bottom-1/4 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        {/* Pitch stripes */}
        <div
          className="absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 14px, #fff 14px 15px)",
          }}
        />
        {/* Floating sparks */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-amber-300/80"
            style={{
              left: `${18 + i * 16}%`,
              top: `${22 + (i % 3) * 18}%`,
            }}
            animate={{ y: [0, -14, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{
              repeat: Infinity,
              duration: 2.2 + i * 0.35,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-[11px] font-extrabold uppercase tracking-wider ring-1",
            found
              ? "bg-emerald-400/20 text-emerald-200 ring-emerald-300/40"
              : "bg-secondary/20 text-secondary ring-secondary/40",
          ].join(" ")}
        >
          <motion.span
            className={[
              "h-2 w-2 rounded-full",
              found ? "bg-emerald-400" : "bg-secondary",
            ].join(" ")}
            animate={found ? { scale: [1, 1.3, 1] } : { opacity: [1, 0.35, 1] }}
            transition={{ repeat: Infinity, duration: 0.9 }}
          />
          {found ? t("duel.matchedTitle") : t("duel.matchingBadge")}
        </motion.div>

        {/* VS stage */}
        <div className="relative flex w-full items-center justify-center gap-2 px-1">
          {/* You */}
          <motion.div
            initial={{ x: -28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="relative">
              <motion.span
                className="absolute -inset-2 rounded-full bg-primary/30 blur-lg"
                animate={{ opacity: [0.35, 0.7, 0.35] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              />
              <AvatarImage
                avatarKey={yourAvatar}
                className="relative h-24 w-24 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-4 ring-primary"
              />
              <span className="absolute -bottom-1 inset-s-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 font-display text-[9px] font-black text-primary-foreground shadow-md">
                {t("duel.you")}
              </span>
            </div>
            <p className="mt-1 max-w-24 truncate font-display text-sm font-bold text-white">
              {yourName?.trim() || t("duel.you")}
            </p>
          </motion.div>

          {/* Radar / VS */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 80 80"
              aria-hidden
            >
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="4"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke={found ? "rgb(52 211 153)" : "rgb(251 146 60)"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={ring}
                animate={{ strokeDashoffset: ring - dash }}
                transition={{ duration: 0.15, ease: "linear" }}
              />
            </svg>
            {!found && (
              <>
                <motion.span
                  className="absolute inset-1 rounded-full border-2 border-secondary/50"
                  animate={{ scale: [1, 1.45], opacity: [0.65, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.25,
                    ease: "easeOut",
                  }}
                />
                <motion.span
                  className="absolute inset-3 rounded-full border border-dashed border-amber-300/60"
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.4,
                    ease: "linear",
                  }}
                />
              </>
            )}
            <motion.span
              className={[
                "relative z-10 font-display text-2xl font-black",
                found ? "text-emerald-300" : "text-amber-300",
              ].join(" ")}
              animate={
                found
                  ? { scale: [1, 1.35, 1], rotate: [0, -6, 6, 0] }
                  : { scale: [1, 1.1, 1] }
              }
              transition={{
                repeat: Infinity,
                duration: found ? 0.7 : 1.1,
              }}
            >
              VS
            </motion.span>
          </div>

          {/* Scanning rival */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-24 w-24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={found ? "found" : rivalKey}
                  initial={{ scale: 0.65, opacity: 0, rotateY: 40 }}
                  animate={{
                    scale: 1,
                    opacity: found ? 1 : 0.9,
                    rotateY: 0,
                  }}
                  exit={{ scale: 0.7, opacity: 0, rotateY: -40 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="absolute inset-0"
                >
                  <span
                    className={[
                      "absolute -inset-2 rounded-full blur-lg",
                      found
                        ? foundIsBot
                          ? "bg-amber-400/35"
                          : "bg-sky-400/40"
                        : "bg-white/10",
                    ].join(" ")}
                  />
                  <AvatarImage
                    avatarKey={rivalKey}
                    className={[
                      "relative h-24 w-24 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-4",
                      found
                        ? foundIsBot
                          ? "ring-amber-400"
                          : "ring-sky-400"
                        : "ring-white/25",
                    ].join(" ")}
                    muted={!found}
                  />
                  {!found && (
                    <motion.span
                      className="pointer-events-none absolute inset-x-1 top-0 h-1/2 rounded-full bg-linear-to-b from-sky-300/55 to-transparent"
                      animate={{ y: [0, 56, 0], opacity: [0.3, 0.85, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.05,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  {found && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0.6, 1.4], opacity: [0.8, 0] }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0 rounded-full ring-4 ring-emerald-300"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="max-w-24 truncate font-display text-sm font-bold text-white/85">
              {found
                ? foundIsBot
                  ? t("duel.vsBot")
                  : t("duel.vsRival")
                : rivalLabel}
            </p>
          </div>
        </div>

        {/* Candidate ticker */}
        {!found && (
          <div className="relative w-full max-w-xs overflow-hidden rounded-2xl bg-black/30 px-3 py-2.5 ring-1 ring-white/10">
            <p className="mb-2 font-display text-[10px] font-extrabold uppercase tracking-widest text-white/45">
              {t("duel.matchingScanning")}
            </p>
            <div className="flex justify-center gap-2.5">
              {[-2, -1, 0, 1, 2].map((offset) => {
                const idx =
                  (scanIndex + offset + scanKeys.length) % scanKeys.length;
                const key = scanKeys[idx]!;
                const active = offset === 0;
                return (
                  <motion.div
                    key={`${key}-${offset}`}
                    animate={{
                      scale: active ? 1.12 : 0.82,
                      opacity: active ? 1 : 0.35,
                      y: active ? -2 : 0,
                    }}
                    className="shrink-0"
                  >
                    <AvatarImage
                      avatarKey={key}
                      className={[
                        "h-10 w-10 rounded-full",
                        active
                          ? "ring-2 ring-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                          : "ring-1 ring-white/20",
                      ].join(" ")}
                      muted={!active}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stakes */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <StakeChip
            icon="/icons/xp.png"
            label={t("duel.matchingStakeXp", {
              n: toLocaleDigits(weeklyXp, locale),
            })}
          />
          <StakeChip
            icon="/icons/energy.png"
            label={t("duel.matchingStakeEnergy", {
              n: toLocaleDigits(staminaCost, locale),
            })}
          />
          <StakeChip
            icon="/icons/trophy.png"
            label={t("duel.matchingStakeGlory")}
          />
        </div>

        <div className="px-2">
          <h1 className="font-display text-2xl font-black text-white drop-shadow-md">
            {found ? t("duel.matchedTitle") : t("duel.matchingTitle")}
          </h1>
          <p className="mt-2 max-w-xs font-body text-sm font-semibold text-white/60">
            {found
              ? foundIsBot
                ? t("duel.matchedBot")
                : t("duel.matchedHuman")
              : t("duel.matchingHint")}
          </p>
          {!found && (
            <motion.p
              key={elapsedSec}
              initial={{ scale: 0.96, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 font-display text-sm font-black tabular-nums text-amber-300"
            >
              {t("duel.matchingTimer", {
                s: toLocaleDigits(elapsedSec, locale),
              })}
            </motion.p>
          )}
          {found && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 font-display text-sm font-extrabold text-emerald-300"
            >
              {t("duel.matchingKickoff")}
            </motion.p>
          )}
        </div>

        {!found && (
          <p className="font-body text-[11px] font-semibold text-white/40">
            {t("duel.summaryAutoRefresh")}
          </p>
        )}
      </div>
    </section>
  );
}

function StakeChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-display text-[11px] font-bold text-white/90 ring-1 ring-white/15">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon}
        alt=""
        draggable={false}
        className="h-4 w-4 object-contain"
      />
      {label}
    </span>
  );
}
