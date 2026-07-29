"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import type { BadgeTier } from "@/lib/game/achievements";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { ResourceIcon } from "@/components/common/ResourceIcon";

const TIER_GLOW: Record<BadgeTier, string> = {
  bronze: "from-amber-200 via-amber-300 to-amber-500 shadow-amber-400/40",
  silver: "from-slate-100 via-slate-200 to-slate-400 shadow-slate-400/40",
  gold: "from-yellow-200 via-amber-300 to-yellow-500 shadow-yellow-400/50",
};

type BadgeUnlockPopupProps = {
  badges: UnlockedBadge[];
  onClose: () => void;
};

/**
 * Celebratory badge unlock sheet — gamified card list with art, copy, and
 * reward pills. Content (title / description / image) comes from admin
 * BadgeDefinition rows merged at settle time.
 */
export function BadgeUnlockPopup({ badges, onClose }: BadgeUnlockPopupProps) {
  const { t, locale } = useTranslation();

  useEffect(() => {
    playSound("goal");
    haptic(HAPTIC.goal);
  }, []);

  const title =
    badges.length > 1
      ? t("result.badgesUnlocked", { n: toLocaleDigits(badges.length, locale) })
      : t("result.badgeUnlocked");

  return (
    <AnimatePresence>
      <motion.div
        key="badge-unlock"
        className="fixed inset-0 z-[70] flex items-end justify-center px-4 pb-6 pt-10 sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          type="button"
          aria-label={t("result.badgeContinue")}
          onClick={onClose}
          className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
        />

        {/* Soft confetti sparks */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {["✨", "⭐", "🎉", "💫", "🏅"].map((spark, i) => (
            <motion.span
              key={spark + i}
              className="absolute text-xl"
              style={{
                left: `${12 + i * 18}%`,
                top: `${18 + (i % 3) * 10}%`,
              }}
              initial={{ opacity: 0, y: 20, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-10, -40, -70],
                scale: [0.4, 1.1, 0.8],
                rotate: [-12, 8, 20],
              }}
              transition={{ duration: 1.4, delay: 0.1 + i * 0.08 }}
            >
              {spark}
            </motion.span>
          ))}
        </div>

        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="badge-unlock-title"
          className="relative w-full max-w-mobile overflow-hidden rounded-[1.75rem] border border-black/5 bg-[#fffdf8] p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]"
          initial={{ scale: 0.88, y: 40, opacity: 0 }}
          animate={{
            scale: 1,
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 380, damping: 24 },
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-amber-200/50 to-transparent"
          />

          <h2
            id="badge-unlock-title"
            className="relative text-center font-display text-xl font-black tracking-tight text-amber-600 drop-shadow-sm"
          >
            {title}
          </h2>

          <div className="relative mt-4 flex max-h-[min(52dvh,420px)] flex-col gap-2.5 overflow-y-auto overscroll-contain pe-0.5">
            {badges.map((badge, i) => {
              const name = locale === "fa" ? badge.nameFa : badge.nameEn;
              const desc =
                locale === "fa" ? badge.descriptionFa : badge.descriptionEn;
              return (
                <motion.div
                  key={badge.slug}
                  initial={{ opacity: 0, x: locale === "fa" ? 18 : -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 22,
                    delay: 0.12 + i * 0.1,
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-black/6 bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_14px_-6px_rgba(0,0,0,0.12)]"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -24 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 14,
                      delay: 0.2 + i * 0.1,
                    }}
                    className={[
                      "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-b shadow-lg ring-[3px] ring-white",
                      TIER_GLOW[badge.tier],
                    ].join(" ")}
                  >
                    {badge.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={badge.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl drop-shadow-sm" aria-hidden>
                        {badge.emoji}
                      </span>
                    )}
                  </motion.div>

                  <div className="min-w-0 flex-1 text-start">
                    <p className="font-display text-base font-extrabold leading-tight text-slate-900">
                      {name}
                    </p>
                    {desc && (
                      <p className="mt-0.5 line-clamp-2 font-body text-[12px] font-semibold leading-snug text-slate-500">
                        {desc}
                      </p>
                    )}
                    {(badge.coins > 0 || badge.xp > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {badge.coins > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-display text-xs font-black text-amber-700 ring-1 ring-amber-200/80">
                            <ResourceIcon kind="coin" size="sm" />+
                            {toLocaleDigits(badge.coins, locale)}
                          </span>
                        )}
                        {badge.xp > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 font-display text-[11px] font-black text-white shadow-sm">
                            <ResourceIcon kind="xp" size="sm" className="brightness-110" />+
                            {toLocaleDigits(badge.xp, locale)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.98, y: 2 }}
            className="mt-5 flex min-h-touch w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3.5 font-display text-base font-black text-white shadow-[0_6px_0_0_#059669] transition-transform active:shadow-[0_2px_0_0_#059669]"
          >
            {t("result.badgeContinue")}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
