"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import { ACHIEVEMENTS_BY_SLUG, type BadgeTier } from "@/lib/game/achievements";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

/** Tier → medal ring styling (bronze / silver / gold). */
const TIER_RING: Record<BadgeTier, string> = {
  bronze: "from-amber-200 to-amber-500 text-amber-900",
  silver: "from-slate-200 to-slate-400 text-slate-800",
  gold: "from-yellow-200 to-yellow-500 text-yellow-900",
};

type BadgeUnlockPopupProps = {
  badges: UnlockedBadge[];
  onClose: () => void;
};

/**
 * Celebratory overlay shown after a match when one or more badges are unlocked.
 * Pops in with a spring, plays a goal cheer + heavy haptic, and lists every new
 * badge with its localized name, description, and one-off reward.
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
        className="fixed inset-0 z-[70] flex items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <button
          aria-label={t("result.badgeContinue")}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          role="alertdialog"
          aria-modal="true"
          className="relative w-full max-w-mobile rounded-bubble-xl border border-border bg-card p-6 text-center shadow-fantasy"
          initial={{ scale: 0.8, y: 24, opacity: 0 }}
          animate={{
            scale: 1,
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 380, damping: 24 },
          }}
        >
          {/* Sparkle burst behind the title */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-4 text-center text-2xl"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1.4] }}
            transition={{ duration: 1.1, times: [0, 0.3, 1] }}
          >
            ✨🎉✨
          </motion.div>

          <p className="font-display text-sm font-bold uppercase tracking-widest text-accent-deep">
            {title}
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {badges.map((badge, i) => {
              const def = ACHIEVEMENTS_BY_SLUG[badge.slug];
              const name = locale === "fa" ? badge.nameFa : badge.nameEn;
              const desc =
                def && (locale === "fa" ? def.descriptionFa : def.descriptionEn);
              return (
                <motion.div
                  key={badge.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 22,
                    delay: 0.15 + i * 0.12,
                  }}
                  className="flex items-center gap-4 rounded-bubble border border-border bg-surface p-3 text-start shadow-fantasy-sm"
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 14,
                      delay: 0.25 + i * 0.12,
                    }}
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-b text-3xl shadow-fantasy ${TIER_RING[badge.tier]}`}
                  >
                    {badge.emoji}
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-surface-foreground">
                      {name}
                    </p>
                    {desc && (
                      <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
                        {desc}
                      </p>
                    )}
                    {(badge.coins > 0 || badge.xp > 0) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {badge.coins > 0 && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 font-display text-xs font-bold text-accent-deep">
                            +{toLocaleDigits(badge.coins, locale)} 💰
                          </span>
                        )}
                        {badge.xp > 0 && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-xs font-bold text-primary">
                            +{toLocaleDigits(badge.xp, locale)} XP
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-fantasy btn-fantasy-primary mt-5 w-full justify-center"
          >
            {t("result.badgeContinue")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
