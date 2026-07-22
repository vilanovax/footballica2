"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import { MANAGER_AVATARS, type AvatarKey } from "@/lib/onboarding/avatars";
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

export function MatchingSearch({
  yourAvatar,
  yourName,
  found = false,
  foundIsBot = false,
}: MatchingSearchProps) {
  const { t, locale } = useTranslation();
  const labels = locale === "fa" ? SCAN_LABELS_FA : SCAN_LABELS_EN;

  const scanKeys = useMemo(() => {
    // Shuffle a copy so each visit feels different.
    const keys = [...SCAN_POOL];
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j]!, keys[i]!];
    }
    return keys;
  }, []);

  const [scanIndex, setScanIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (found) return;
    const id = window.setInterval(() => {
      setScanIndex((i) => (i + 1) % scanKeys.length);
    }, 480);
    return () => window.clearInterval(id);
  }, [found, scanKeys.length]);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((performance.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const rivalKey = scanKeys[scanIndex] ?? "TACTICAL_COACH";
  const rivalLabel = labels[scanIndex % labels.length]!;

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
      {/* VS stage */}
      <div className="relative flex w-full max-w-sm items-center justify-center gap-3 px-2">
        {/* You */}
        <motion.div
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-primary/25 blur-md" />
            <AvatarImage
              avatarKey={yourAvatar}
              className="relative h-24 w-24 rounded-full shadow-fantasy ring-4 ring-primary/50"
            />
          </div>
          <p className="max-w-24 truncate font-display text-sm font-bold text-foreground">
            {yourName?.trim() || t("duel.you")}
          </p>
        </motion.div>

        {/* Radar / VS */}
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          {!found && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-secondary/40"
                animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
              />
              <motion.span
                className="absolute inset-2 rounded-full border border-accent/50"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "linear" }}
                style={{
                  borderStyle: "dashed",
                }}
              />
            </>
          )}
          <motion.span
            className="relative z-10 font-display text-xl font-black text-secondary"
            animate={found ? { scale: [1, 1.25, 1] } : { scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: found ? 0.6 : 1.2 }}
          >
            VS
          </motion.span>
        </div>

        {/* Scanning rival / found */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-24 w-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={found ? "found" : rivalKey}
                initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: found ? 1 : 0.85, rotate: 0 }}
                exit={{ scale: 0.75, opacity: 0, rotate: 8 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="absolute inset-0"
              >
                <span
                  className={[
                    "absolute inset-0 rounded-full blur-md",
                    found
                      ? foundIsBot
                        ? "bg-accent/30"
                        : "bg-secondary/35"
                      : "bg-muted-foreground/20",
                  ].join(" ")}
                />
                <AvatarImage
                  avatarKey={rivalKey}
                  className={[
                    "relative h-24 w-24 rounded-full shadow-fantasy ring-4",
                    found ? "ring-secondary" : "ring-border opacity-90",
                  ].join(" ")}
                  muted={!found}
                />
                {!found && (
                  <motion.span
                    className="pointer-events-none absolute inset-x-2 top-0 h-1/3 rounded-full bg-gradient-to-b from-secondary/50 to-transparent"
                    animate={{ y: [0, 72, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.1,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="max-w-24 truncate font-display text-sm font-bold text-muted-foreground">
            {found
              ? foundIsBot
                ? t("duel.vsBot")
                : t("duel.vsRival")
              : rivalLabel}
          </p>
        </div>
      </div>

      {/* Side chips — scrolling candidates */}
      {!found && (
        <div className="flex w-full max-w-sm justify-center gap-2 overflow-hidden px-4">
          {[-1, 0, 1].map((offset) => {
            const idx =
              (scanIndex + offset + scanKeys.length) % scanKeys.length;
            const key = scanKeys[idx]!;
            return (
              <motion.div
                key={`${key}-${offset}`}
                animate={{
                  scale: offset === 0 ? 1 : 0.85,
                  opacity: offset === 0 ? 1 : 0.45,
                }}
                className="shrink-0"
              >
                <AvatarImage
                  avatarKey={key}
                  className="h-11 w-11 rounded-full ring-2 ring-border"
                  muted={offset !== 0}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {found ? t("duel.matchedTitle") : t("duel.matchingTitle")}
        </h1>
        <p className="mt-2 max-w-xs font-body text-sm font-semibold text-muted-foreground">
          {found
            ? foundIsBot
              ? t("duel.matchedBot")
              : t("duel.matchedHuman")
            : t("duel.matchingHint")}
        </p>
        {!found && (
          <p className="mt-3 font-display text-xs font-bold tabular-nums text-primary">
            {t("duel.matchingTimer", {
              s: toLocaleDigits(elapsedSec, locale),
            })}
          </p>
        )}
      </div>

      {!found && (
        <p className="font-body text-[11px] font-semibold text-muted-foreground">
          {t("duel.summaryAutoRefresh")}
        </p>
      )}
    </section>
  );
}
