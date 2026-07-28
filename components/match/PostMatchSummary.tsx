"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { CountUp } from "@/components/quiz/CountUp";
import { BadgeUnlockPopup } from "@/components/quiz/BadgeUnlockPopup";
import { MissionProgressBanner } from "@/components/missions/MissionProgressBanner";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import type {
  PostMatchAchievements,
  PostMatchCtas,
  PostMatchOutcome,
  PostMatchRewards,
} from "./postMatchTypes";

export type PostMatchSummaryProps = {
  outcome: PostMatchOutcome;
  rewards: PostMatchRewards;
  achievements?: PostMatchAchievements;
  ctas: PostMatchCtas;
  /** Celebrate newly unlocked catalog badges as a full-screen overlay. */
  celebrateBadges?: boolean;
};

const sectionMotion = {
  outcome: { delay: 0 },
  rewards: { delay: 0.18 },
  achievements: { delay: 0.38 },
} as const;

/**
 * Shared end-of-match shell — Outcome → Rewards → Achievements → sticky CTAs.
 * Mode screens only map settle data into these four sections.
 */
export function PostMatchSummary({
  outcome,
  rewards,
  achievements,
  ctas,
  celebrateBadges = true,
}: PostMatchSummaryProps) {
  const { t, locale } = useTranslation();
  const badges = achievements?.badges ?? [];
  const [badgesDismissed, setBadgesDismissed] = useState(false);
  const showBadgePopup =
    celebrateBadges && badges.length > 0 && !badgesDismissed;

  const popupBadges: UnlockedBadge[] = badges.map((b) => ({
    slug: b.slug,
    emoji: b.emoji,
    imageUrl: b.imageUrl ?? null,
    nameEn: b.nameEn,
    nameFa: b.nameFa,
    descriptionEn: b.descriptionEn ?? "",
    descriptionFa: b.descriptionFa ?? "",
    tier: b.tier ?? "bronze",
    coins: b.coins ?? 0,
    xp: b.xp ?? 0,
  }));

  const hasRewardTotals =
    rewards.coins > 0 || rewards.xp > 0 || rewards.fans > 0;
  const bonusLines = (rewards.bonusLines ?? []).filter((l) => l.amount > 0);
  const trophies = achievements?.trophies ?? [];
  const level = achievements?.level;
  const missions = achievements?.missions;
  const showMissions =
    missions && (missions.updates.length > 0 || missions.chestReady);
  const hasAchievements =
    Boolean(level) ||
    trophies.length > 0 ||
    Boolean(showMissions) ||
    Boolean(achievements?.milestone) ||
    Boolean(achievements?.streakNote) ||
    (badges.length > 0 && badgesDismissed);

  const hintToneClass =
    outcome.hintTone === "positive"
      ? "text-primary"
      : outcome.hintTone === "negative"
        ? "text-accent-deep"
        : "text-muted-foreground";

  return (
    <>
      {showBadgePopup && (
        <BadgeUnlockPopup
          badges={popupBadges}
          onClose={() => setBadgesDismissed(true)}
        />
      )}

      <section className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-0.5 pb-4 text-center">
          {/* ── 1. Outcome ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: sectionMotion.outcome.delay,
            }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="text-6xl"
              aria-hidden
            >
              {outcome.emoji}
            </motion.div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                {outcome.title}
              </h1>
              {outcome.subtitle && (
                <p className="mt-1 font-display text-lg font-semibold text-muted-foreground">
                  {outcome.subtitle}
                </p>
              )}
              {outcome.hint && (
                <p
                  className={[
                    "mt-2 font-display text-sm font-bold",
                    hintToneClass,
                  ].join(" ")}
                >
                  {outcome.hint}
                </p>
              )}
            </div>

            {outcome.chips && outcome.chips.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {outcome.chips.map((chip, i) => (
                  <motion.div
                    key={chip.key}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 14,
                      delay: 0.2 + i * 0.06,
                    }}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-sm font-bold",
                      chip.tone === "secondary"
                        ? "bg-secondary/15 text-secondary"
                        : chip.tone === "muted"
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent/15 text-accent-deep",
                    ].join(" ")}
                  >
                    {chip.label}
                  </motion.div>
                ))}
              </div>
            )}

            {outcome.children && (
              <div className="mt-1 w-full text-start">{outcome.children}</div>
            )}
          </motion.div>

          {/* ── 2. Rewards ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 22,
              delay: sectionMotion.rewards.delay,
            }}
            className="flex w-full flex-col gap-3"
          >
            <p className="px-1 text-start font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("result.rewardsSection")}
            </p>
            <div className="grid w-full grid-cols-3 gap-3">
              {(
                [
                  {
                    key: "coins",
                    label: t("result.coins"),
                    amount: rewards.coins,
                    tone: "text-accent-deep",
                  },
                  {
                    key: "xp",
                    label: t("result.xp"),
                    amount: rewards.xp,
                    tone: "text-primary",
                  },
                  {
                    key: "fans",
                    label: t("result.fans"),
                    amount: rewards.fans,
                    tone: "text-secondary",
                  },
                ] as const
              ).map((r) => {
                const earned = r.amount > 0;
                return (
                  <div
                    key={r.key}
                    className={[
                      "rounded-bubble border px-3 py-4 shadow-fantasy transition-colors",
                      earned
                        ? "border-border bg-surface"
                        : "border-border bg-muted/50",
                    ].join(" ")}
                  >
                    <p
                      className={[
                        "font-display text-xl font-bold",
                        earned ? r.tone : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {earned || hasRewardTotals ? (
                        <CountUp
                          value={r.amount}
                          locale={locale}
                          prefix="+"
                          delay={0.2}
                        />
                      ) : (
                        `+${toLocaleDigits(0, locale)}`
                      )}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {r.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {bonusLines.length > 0 && (
              <div className="w-full space-y-1">
                {bonusLines.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-center justify-between rounded-full bg-muted/60 px-3 py-1.5 text-xs font-semibold"
                  >
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="font-display font-bold text-surface-foreground">
                      +{toLocaleDigits(line.amount, locale)} {line.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {rewards.balances && (
              <div className="flex items-center justify-center gap-1.5 rounded-full bg-surface px-4 py-2 font-display text-sm font-bold shadow-fantasy-sm">
                <span className="text-accent-deep">
                  💰 {toLocaleDigits(rewards.balances.coins, locale)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-secondary">
                  👥 {toLocaleDigits(rewards.balances.fans, locale)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-primary">
                  ⚡ {toLocaleDigits(rewards.balances.stamina, locale)}/
                  {toLocaleDigits(rewards.balances.maxStamina, locale)}
                </span>
              </div>
            )}
          </motion.div>

          {/* ── 3. Achievements ────────────────────────────────────── */}
          {hasAchievements && (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 22,
                delay: sectionMotion.achievements.delay,
              }}
              className="flex w-full flex-col gap-3"
            >
              <p className="px-1 text-start font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("result.achievementsSection")}
              </p>

              {achievements?.streakNote && (
                <p className="font-display text-xs font-bold text-secondary">
                  {achievements.streakNote}
                </p>
              )}

              {trophies.length > 0 && (
                <div className="flex flex-col gap-2">
                  {trophies.map((trophy, i) => (
                    <motion.div
                      key={trophy.key}
                      initial={{ opacity: 0, scale: 0.92, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 16,
                        delay: 0.42 + i * 0.06,
                      }}
                      className="flex items-center gap-3 rounded-bubble border-2 border-secondary/40 bg-secondary/10 px-4 py-3 text-start shadow-fantasy-sm"
                    >
                      <span className="text-3xl" aria-hidden>
                        {trophy.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold text-secondary">
                          {trophy.title}
                        </p>
                        {trophy.subtitle && (
                          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                            {trophy.subtitle}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {badges.length > 0 && badgesDismissed && (
                <div className="flex flex-wrap justify-center gap-2">
                  {badges.map((b) => (
                    <span
                      key={b.slug}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 font-display text-xs font-bold text-accent-deep"
                    >
                      <span aria-hidden>{b.emoji}</span>
                      {locale === "fa" ? b.nameFa : b.nameEn}
                    </span>
                  ))}
                </div>
              )}

              {showMissions && missions && (
                <MissionProgressBanner missions={missions} />
              )}

              {level && (
                <div className="w-full rounded-bubble border border-border bg-surface p-4 shadow-fantasy">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-primary">
                      {t("result.level", {
                        n: toLocaleDigits(level.level, locale),
                      })}
                    </span>
                    <span className="font-display text-xs font-semibold text-muted-foreground">
                      {t("result.xpToGo", {
                        cur: toLocaleDigits(level.currentLevelXp, locale),
                        next: toLocaleDigits(level.nextLevelXp, locale),
                      })}
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
                      initial={{
                        width: `${Math.round(level.barFrom * 100)}%`,
                      }}
                      animate={{
                        width: `${Math.round(level.progress * 100)}%`,
                      }}
                      transition={{
                        duration: 0.9,
                        delay: 0.5,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                  {level.levelUp && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 16,
                        delay: 0.7,
                      }}
                      className="mt-3 flex flex-wrap items-center justify-center gap-x-2 rounded-bubble bg-accent/15 px-3 py-2 font-display text-sm font-bold text-accent-deep"
                    >
                      <span>🎉 {t("result.levelUp")}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>
                        {t("result.levelUpPerk", {
                          coins: toLocaleDigits(
                            level.levelUp.coinReward,
                            locale,
                          ),
                        })}
                      </span>
                    </motion.div>
                  )}
                </div>
              )}

              {achievements?.milestone && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.55,
                    type: "spring",
                    stiffness: 220,
                    damping: 20,
                  }}
                  className="w-full rounded-bubble border-2 border-accent/40 bg-accent/10 p-4 text-start shadow-fantasy"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden>
                      {achievements.milestone.icon}
                    </span>
                    <div className="flex-1">
                      <p className="font-display text-[0.7rem] font-bold uppercase tracking-widest text-accent-deep">
                        {achievements.milestone.eyebrow}
                      </p>
                      <p className="mt-0.5 font-display text-sm font-bold text-foreground">
                        {achievements.milestone.body}
                      </p>
                    </div>
                  </div>
                  {achievements.milestone.fill != null && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-linear-to-r from-accent to-secondary"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(
                            100,
                            Math.round(achievements.milestone.fill * 100),
                          )}%`,
                        }}
                        transition={{
                          duration: 0.9,
                          delay: 0.75,
                          ease: "easeOut",
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {/* ── 4. Sticky CTAs ───────────────────────────────────────── */}
        <motion.footer
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="sticky bottom-0 z-10 mt-auto flex w-full shrink-0 flex-col gap-3 border-t border-border/60 bg-background/95 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md"
        >
          {ctas.notice && (
            <div className="w-full rounded-bubble border border-accent/40 bg-accent/10 px-4 py-3 text-center font-display text-sm font-bold text-accent-deep">
              {ctas.notice}
            </div>
          )}
          {ctas.primary && (
            <CtaButton cta={ctas.primary} fallbackVariant="primary" />
          )}
          {ctas.secondary && (
            <CtaButton
              cta={ctas.secondary}
              fallbackVariant={ctas.primary ? "accent" : "primary"}
            />
          )}
          {ctas.tertiary && (
            <CtaButton cta={ctas.tertiary} fallbackVariant="secondary" />
          )}
        </motion.footer>
      </section>
    </>
  );
}

function CtaButton({
  cta,
  fallbackVariant,
}: {
  cta: NonNullable<PostMatchCtas["primary"]>;
  fallbackVariant: "primary" | "accent" | "secondary";
}) {
  const variant = cta.variant ?? fallbackVariant;
  if (variant === "secondary") {
    return (
      <button
        type="button"
        disabled={cta.disabled}
        onClick={cta.onClick}
        className="min-h-touch w-full rounded-bubble border-2 border-border bg-surface px-5 py-3 font-display text-sm font-bold text-muted-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {cta.label}
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={cta.disabled}
      onClick={cta.onClick}
      className={[
        "btn-fantasy w-full justify-center disabled:opacity-50",
        variant === "accent" ? "btn-fantasy-accent" : "btn-fantasy-primary",
      ].join(" ")}
    >
      {cta.label}
    </button>
  );
}
