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
import {
  GameChip,
  GameCta,
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";

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
  rewards: { delay: 0.1 },
  achievements: { delay: 0.22 },
} as const;

/**
 * Shared end-of-match shell — Arena chrome.
 * Outcome → Rewards → Achievements → in-flow CTA dock.
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

  const won =
    outcome.hintTone === "positive" ||
    Boolean(outcome.heroSrc?.includes("trophy"));
  const dualCtas = Boolean(ctas.primary && ctas.secondary && !ctas.tertiary);

  return (
    <>
      {showBadgePopup && (
        <BadgeUnlockPopup
          badges={popupBadges}
          onClose={() => setBadgesDismissed(true)}
        />
      )}

      <section className="relative -mx-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-arena px-4 text-arena-fg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-arena-deep via-arena to-arena-mid"
        />
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute -end-16 top-0 h-48 w-48 rounded-full blur-3xl",
            won ? "bg-emerald-400/20" : "bg-rose-400/18",
          ].join(" ")}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-20 bottom-24 h-40 w-40 rounded-full bg-amber-400/12 blur-3xl"
        />

        <div className="relative flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain pb-3 pt-1 text-center">
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
          >
            <GamePanel
              tone={won ? "emerald" : "rose"}
              className="flex flex-col items-center gap-2.5 px-4 py-5"
            >
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : { rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }
                }
                transition={{ duration: 0.55, delay: 0.05 }}
                className="flex h-[4.75rem] w-[4.75rem] items-center justify-center"
                aria-hidden
              >
                {outcome.heroSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={outcome.heroSrc}
                    alt=""
                    draggable={false}
                    className="h-[4.75rem] w-[4.75rem] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
                  />
                ) : (
                  <span className="text-5xl">{outcome.emoji}</span>
                )}
              </motion.div>

              <div>
                <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
                  {outcome.title}
                </h1>
                {outcome.subtitle && (
                  <p className="mt-1 font-display text-base font-semibold text-white/65">
                    {outcome.subtitle}
                  </p>
                )}
                {outcome.hint && (
                  <p
                    className={[
                      "mt-2 font-display text-sm font-bold",
                      outcome.hintTone === "positive"
                        ? "text-emerald-300"
                        : outcome.hintTone === "negative"
                          ? "text-amber-300"
                          : "text-white/60",
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
                    >
                      {chip.bare ? (
                        <span className="inline-flex items-center gap-1.5 font-display text-sm font-black text-white">
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
                        </span>
                      ) : (
                        <GameChip
                          tone={
                            chip.tone === "secondary"
                              ? "amber"
                              : chip.tone === "muted"
                                ? "default"
                                : "amber"
                          }
                          className="min-h-9 gap-1.5 px-3 py-1.5 text-sm"
                        >
                          {chip.iconSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={chip.iconSrc}
                              alt=""
                              aria-hidden
                              draggable={false}
                              className="h-5 w-5 object-contain"
                            />
                          ) : null}
                          <span className="tabular-nums">{chip.label}</span>
                        </GameChip>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {outcome.children && (
                <div className="mt-1 w-full text-start">{outcome.children}</div>
              )}
            </GamePanel>
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
          >
            <GamePanel tone="amber" className="w-full p-4">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/75">
                {t("result.rewardsSection")}
              </p>
              <p className="mt-0.5 font-display text-base font-black text-white">
                {t("result.rewardsApplied")}
              </p>

              <div className="mt-3.5 flex items-end justify-around gap-1">
                {(
                  [
                    {
                      key: "coins" as const,
                      kind: "coin" as const,
                      label: t("result.coins"),
                      amount: rewards.coins,
                      tone: "text-amber-300",
                    },
                    {
                      key: "xp" as const,
                      kind: "xp" as const,
                      label: "",
                      amount: rewards.xp,
                      tone: "text-emerald-300",
                    },
                    {
                      key: "fans" as const,
                      kind: "fans" as const,
                      label: t("result.fans"),
                      amount: rewards.fans,
                      tone: "text-sky-300",
                    },
                  ] as const
                ).map((r, i) => {
                  const earned = r.amount > 0;
                  return (
                    <motion.div
                      key={r.key}
                      initial={
                        reduceMotion
                          ? false
                          : { opacity: 0, y: 12, scale: 0.88 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 340,
                        damping: 16,
                        delay: 0.16 + i * 0.06,
                      }}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                    >
                      <div
                        className={
                          earned
                            ? "drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]"
                            : "opacity-40 grayscale"
                        }
                      >
                        <ResourceIcon kind={r.kind} size="xl" />
                      </div>
                      <p
                        className={[
                          "font-display text-2xl font-black tabular-nums leading-none",
                          earned ? r.tone : "text-white/40",
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
                        <p className="font-display text-[11px] font-extrabold text-white/50">
                          {r.label}
                        </p>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>

              {bonusLines.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/10 pt-2.5">
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
                        className="inline-flex items-center gap-1 font-display text-xs font-bold text-white/55"
                      >
                        <span className="text-white/80">{line.label}</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-300">
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
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl bg-black/35 px-3 py-2.5 font-display text-xs font-extrabold tabular-nums text-white/90 ring-1 ring-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
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
            </GamePanel>
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
                <p className="font-display text-[11px] font-bold uppercase tracking-widest text-white/45">
                  {t("result.achievementsSection")}
                </p>
                {achievements?.streakNote && (
                  <GameChip tone="amber" className="max-w-[70%] gap-1 text-[11px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/streak.png"
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="h-4 w-4 object-contain"
                    />
                    <span className="truncate">{achievements.streakNote}</span>
                  </GameChip>
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
                      transition={{ delay: 0.28 + i * 0.05 }}
                    >
                      <GamePanel
                        tone="amber"
                        className="flex items-center gap-3 px-3.5 py-3 text-start"
                      >
                        <span className="text-2xl" aria-hidden>
                          {trophy.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-bold text-amber-200">
                            {trophy.title}
                          </p>
                          {trophy.subtitle && (
                            <p className="mt-0.5 text-xs font-semibold text-white/55">
                              {trophy.subtitle}
                            </p>
                          )}
                        </div>
                      </GamePanel>
                    </motion.div>
                  ))}
                </div>
              )}

              {badges.length > 0 && badgesDismissed && (
                <div className="flex flex-wrap justify-center gap-2">
                  {badges.map((b) => (
                    <GameChip key={b.slug} tone="amber" className="gap-1 text-xs">
                      <span aria-hidden>{b.emoji}</span>
                      {locale === "fa" ? b.nameFa : b.nameEn}
                    </GameChip>
                  ))}
                </div>
              )}

              {showMissions && missions && (
                <MissionProgressBanner missions={missions} arena />
              )}

              {level && (
                <GamePanel tone="emerald" className="w-full p-3.5 text-start">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-emerald-300">
                      {t("result.level", {
                        n: toLocaleDigits(level.level, locale),
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1 font-display text-xs font-semibold tabular-nums text-white/55">
                      {t("result.xpToGo", {
                        cur: toLocaleDigits(level.currentLevelXp, locale),
                        next: toLocaleDigits(level.nextLevelXp, locale),
                      })}
                      <ResourceIcon kind="xp" size="sm" />
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-emerald-400 to-amber-400"
                      initial={{
                        width: `${Math.round(level.barFrom * 100)}%`,
                      }}
                      animate={{
                        width: `${Math.round(level.progress * 100)}%`,
                      }}
                      transition={{
                        duration: 0.85,
                        delay: 0.35,
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
                      transition={{ delay: 0.5 }}
                      className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 rounded-xl bg-amber-400/20 px-3 py-2 font-display text-sm font-bold text-amber-100 ring-1 ring-amber-300/30"
                    >
                      <span>{t("result.levelUp")}</span>
                      <span className="text-white/45">·</span>
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
                </GamePanel>
              )}

              {achievements?.milestone && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 }}
                >
                  <GamePanel tone="amber" className="w-full p-3.5 text-start">
                    <div className="flex items-center gap-3">
                      <GameIconWell size="lg" amber className="text-2xl">
                        <span aria-hidden>{achievements.milestone.icon}</span>
                      </GameIconWell>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[0.65rem] font-bold uppercase tracking-widest text-amber-200/80">
                          {achievements.milestone.eyebrow}
                        </p>
                        <p className="mt-0.5 font-display text-sm font-bold leading-snug text-white">
                          {achievements.milestone.body}
                        </p>
                      </div>
                    </div>
                    {achievements.milestone.fill != null && (
                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                        <motion.div
                          className="h-full rounded-full bg-linear-to-r from-amber-400 to-rose-400"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(
                              100,
                              Math.round(achievements.milestone.fill * 100),
                            )}%`,
                          }}
                          transition={{
                            duration: 0.85,
                            delay: 0.5,
                            ease: "easeOut",
                          }}
                        />
                      </div>
                    )}
                  </GamePanel>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        <motion.footer
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-20 shrink-0 border-t border-white/10 bg-arena/90 px-0.5 pt-3 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md"
        >
          {ctas.notice && (
            <div className="mb-2.5 w-full rounded-xl bg-amber-400/15 px-3 py-2.5 text-center font-display text-sm font-bold text-amber-100 ring-1 ring-amber-300/35">
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
      <GameCta
        variant="ghost"
        block
        disabled={cta.disabled}
        onClick={cta.onClick}
        className="font-display text-sm font-bold"
      >
        {cta.label}
      </GameCta>
    );
  }
  return (
    <GameCta
      variant={variant === "accent" ? "accent" : "primary"}
      block
      disabled={cta.disabled}
      onClick={cta.onClick}
      className="mb-0.5 font-display text-base font-black"
    >
      {cta.label}
    </GameCta>
  );
}
