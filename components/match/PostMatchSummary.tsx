"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { CountUp } from "@/components/quiz/CountUp";
import { BadgeUnlockPopup } from "@/components/quiz/BadgeUnlockPopup";
import { MissionProgressBanner } from "@/components/missions/MissionProgressBanner";
import { ResourceIcon } from "@/components/common/ResourceIcon";
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
  rewards: { delay: 0.12 },
  achievements: { delay: 0.28 },
} as const;

/**
 * Shared end-of-match shell — Outcome → Rewards → Achievements → in-flow CTA dock.
 * Mode screens only map settle data into these four sections.
 *
 * Dock is in-document (not fixed): AppShell already clears BottomNav when present;
 * immersive arenas (penalty/quick) have no nav — fixed+nav-offset left a dead gap.
 */
export function PostMatchSummary({
  outcome,
  rewards,
  achievements,
  ctas,
  celebrateBadges = true,
}: PostMatchSummaryProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
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

  const dualCtas = Boolean(ctas.primary && ctas.secondary && !ctas.tertiary);

  return (
    <>
      {showBadgePopup && (
        <BadgeUnlockPopup
          badges={popupBadges}
          onClose={() => setBadgesDismissed(true)}
        />
      )}

      <section className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-0.5 pb-3 text-center">
          {/* ── 1. Outcome ─────────────────────────────────────────── */}
          <motion.div
            initial={
              reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 22,
              delay: sectionMotion.outcome.delay,
            }}
            className="flex flex-col items-center gap-2.5"
          >
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : { rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }
              }
              transition={{ duration: 0.55, delay: 0.05 }}
              className={
                outcome.heroSrc
                  ? "flex h-[4.5rem] w-[4.5rem] items-center justify-center"
                  : "text-5xl"
              }
              aria-hidden
            >
              {outcome.heroSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={outcome.heroSrc}
                  alt=""
                  draggable={false}
                  className="h-[4.5rem] w-[4.5rem] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                />
              ) : (
                outcome.emoji
              )}
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-black text-foreground sm:text-3xl">
                {outcome.title}
              </h1>
              {outcome.subtitle && (
                <p className="mt-0.5 font-display text-base font-semibold text-muted-foreground">
                  {outcome.subtitle}
                </p>
              )}
              {outcome.hint && (
                <p
                  className={[
                    "mt-1.5 font-display text-sm font-bold",
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
                    initial={
                      reduceMotion ? false : { opacity: 0, scale: 0.85 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 16,
                      delay: 0.15 + i * 0.05,
                    }}
                    className={
                      chip.bare
                        ? "inline-flex items-center gap-1.5 font-display text-sm font-black text-foreground"
                        : [
                            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-sm font-bold shadow-fantasy-sm",
                            chip.tone === "secondary"
                              ? "bg-secondary/15 text-secondary"
                              : chip.tone === "muted"
                                ? "bg-muted text-muted-foreground"
                                : "bg-accent/15 text-accent-deep",
                          ].join(" ")
                    }
                  >
                    {chip.iconSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={chip.iconSrc}
                        alt=""
                        aria-hidden
                        draggable={false}
                        className="h-6 w-6 object-contain"
                      />
                    ) : null}
                    <span className="tabular-nums">{chip.label}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {outcome.children && (
              <div className="mt-1 w-full text-start">{outcome.children}</div>
            )}
          </motion.div>

          {/* ── 2. Rewards board ───────────────────────────────────── */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
              delay: sectionMotion.rewards.delay,
            }}
            className="w-full rounded-bubble-xl border border-border/70 bg-surface/90 p-4 shadow-fantasy-sm"
          >
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {t("result.rewardsSection")}
            </p>
            <p className="mt-0.5 font-display text-base font-black text-foreground">
              {t("result.rewardsApplied")}
            </p>

            <div className="mt-3 flex items-end justify-around gap-1">
              {(
                [
                  {
                    key: "coins" as const,
                    kind: "coin" as const,
                    label: t("result.coins"),
                    amount: rewards.coins,
                    tone: "text-accent-deep",
                    glow: "shadow-[0_0_16px_rgba(234,179,8,0.3)]",
                  },
                  {
                    key: "xp" as const,
                    kind: "xp" as const,
                    label: "",
                    amount: rewards.xp,
                    tone: "text-primary",
                    glow: "shadow-[0_0_16px_rgba(0,209,102,0.28)]",
                  },
                  {
                    key: "fans" as const,
                    kind: "fans" as const,
                    label: t("result.fans"),
                    amount: rewards.fans,
                    tone: "text-secondary",
                    glow: "shadow-[0_0_16px_rgba(255,90,54,0.28)]",
                  },
                ] as const
              ).map((r, i) => {
                const earned = r.amount > 0;
                return (
                  <motion.div
                    key={r.key}
                    initial={
                      reduceMotion ? false : { opacity: 0, y: 12, scale: 0.88 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 340,
                      damping: 16,
                      delay: 0.16 + i * 0.06,
                    }}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className={[
                        "rounded-full",
                        earned ? r.glow : "opacity-35 grayscale",
                      ].join(" ")}
                    >
                      <ResourceIcon kind={r.kind} size="xl" />
                    </div>
                    <p
                      className={[
                        "font-display text-2xl font-black tabular-nums leading-none",
                        earned ? r.tone : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {earned || hasRewardTotals ? (
                        <CountUp
                          value={r.amount}
                          locale={locale}
                          prefix={t("result.earnedPrefix")}
                          delay={0.18 + i * 0.05}
                        />
                      ) : (
                        `${t("result.earnedPrefix")}${toLocaleDigits(0, locale)}`
                      )}
                    </p>
                    {r.label ? (
                      <p className="font-display text-[11px] font-extrabold text-muted-foreground">
                        {r.label}
                      </p>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>

            {bonusLines.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border/50 pt-2.5">
                {bonusLines.map((line) => {
                  const unitKey = line.unit.toLowerCase();
                  const iconKind =
                    unitKey === "xp" || unitKey === "امتیاز"
                      ? ("xp" as const)
                      : unitKey.includes("coin") ||
                          unitKey.includes("سکه") ||
                          unitKey === "💰"
                        ? ("coin" as const)
                        : null;
                  return (
                    <span
                      key={line.key}
                      className="inline-flex items-center gap-1 font-display text-xs font-bold text-muted-foreground"
                    >
                      <span className="text-foreground/80">{line.label}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-0.5 text-accent-deep">
                        +{toLocaleDigits(line.amount, locale)}
                        {iconKind ? (
                          <ResourceIcon kind={iconKind} size="sm" />
                        ) : (
                          <> {line.unit}</>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}

            {rewards.balances && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-muted/60 px-3 py-2 font-display text-xs font-extrabold tabular-nums text-foreground/85">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("result.balanceAfter")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="coin" size="sm" />
                  {toLocaleDigits(rewards.balances.coins, locale)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="fans" size="sm" />
                  {toLocaleDigits(rewards.balances.fans, locale)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ResourceIcon kind="energy" size="sm" />
                  {toLocaleDigits(rewards.balances.stamina, locale)}/
                  {toLocaleDigits(rewards.balances.maxStamina, locale)}
                </span>
              </div>
            )}
          </motion.div>

          {/* ── 3. Achievements ────────────────────────────────────── */}
          {hasAchievements && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                delay: sectionMotion.achievements.delay,
              }}
              className="flex w-full flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2 px-0.5">
                <p className="font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("result.achievementsSection")}
                </p>
                {achievements?.streakNote && (
                  <span className="inline-flex max-w-[70%] items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 font-display text-[11px] font-bold text-secondary">
                    <span aria-hidden>🔥</span>
                    <span className="truncate">{achievements.streakNote}</span>
                  </span>
                )}
              </div>

              {trophies.length > 0 && (
                <div className="flex flex-col gap-2">
                  {trophies.map((trophy, i) => (
                    <motion.div
                      key={trophy.key}
                      initial={
                        reduceMotion ? false : { opacity: 0, y: 8 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.32 + i * 0.05 }}
                      className="flex items-center gap-3 rounded-bubble border-2 border-secondary/35 bg-secondary/10 px-3.5 py-3 text-start shadow-fantasy-sm"
                    >
                      <span className="text-2xl" aria-hidden>
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
                <div className="w-full rounded-bubble border border-border bg-surface p-3.5 text-start shadow-fantasy-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-primary">
                      {t("result.level", {
                        n: toLocaleDigits(level.level, locale),
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1 font-display text-xs font-semibold tabular-nums text-muted-foreground">
                      {t("result.xpToGo", {
                        cur: toLocaleDigits(level.currentLevelXp, locale),
                        next: toLocaleDigits(level.nextLevelXp, locale),
                      })}
                      <ResourceIcon kind="xp" size="sm" />
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-primary to-secondary"
                      initial={{
                        width: `${Math.round(level.barFrom * 100)}%`,
                      }}
                      animate={{
                        width: `${Math.round(level.progress * 100)}%`,
                      }}
                      transition={{
                        duration: 0.85,
                        delay: 0.4,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                  {level.levelUp && (
                    <motion.div
                      initial={
                        reduceMotion ? false : { opacity: 0, y: 6 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 }}
                      className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 rounded-2xl bg-accent/15 px-3 py-2 font-display text-sm font-bold text-accent-deep"
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
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42 }}
                  className="w-full rounded-bubble border border-accent/35 bg-accent/10 p-3.5 text-start shadow-fantasy-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-2xl shadow-fantasy-sm"
                      aria-hidden
                    >
                      {achievements.milestone.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-accent-deep">
                        {achievements.milestone.eyebrow}
                      </p>
                      <p className="mt-0.5 font-display text-sm font-bold leading-snug text-foreground">
                        {achievements.milestone.body}
                      </p>
                    </div>
                  </div>
                  {achievements.milestone.fill != null && (
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
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
                          duration: 0.85,
                          delay: 0.55,
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

        {/* In-flow dock — clears fantasy button 3D shadow; no fixed/nav offset */}
        <motion.footer
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="relative z-20 shrink-0 border-t border-border/60 bg-background/95 px-0.5 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md"
        >
          {ctas.notice && (
            <div className="mb-2.5 w-full rounded-bubble border border-accent/40 bg-accent/10 px-3 py-2.5 text-center font-display text-sm font-bold text-accent-deep">
              {ctas.notice}
            </div>
          )}

          {dualCtas ? (
            <div className="flex flex-col gap-2.5">
              <CtaButton cta={ctas.primary!} fallbackVariant="primary" />
              <CtaButton cta={ctas.secondary!} fallbackVariant="accent" />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
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
            </div>
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
        "btn-fantasy mb-0.5 min-h-touch w-full justify-center text-base disabled:opacity-50",
        variant === "accent" ? "btn-fantasy-accent" : "btn-fantasy-primary",
      ].join(" ")}
    >
      {cta.label}
    </button>
  );
}
