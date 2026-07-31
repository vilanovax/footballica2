"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { GotdRewardsPayload } from "@/lib/game/gotdRewards";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  open: boolean;
  outcome: "SOLVED" | "FAILED";
  kind: "mystery" | "grid" | "starPath";
  rewards: GotdRewardsPayload | null;
  /** Streak before hard-reset on loss. */
  previousStreak?: number;
  currentStreak?: number;
  shareCode?: string | null;
  unlockedBadges?: UnlockedBadge[];
  onShare?: () => void;
  onClose?: () => void;
  playHref?: string;
};

/**
 * Premium GotD post-game overlay — win reward breakdown or streak-broken loss.
 */
export function GotdResultModal({
  open,
  outcome,
  kind,
  rewards,
  previousStreak = 0,
  currentStreak = 0,
  shareCode,
  unlockedBadges = [],
  onShare,
  onClose,
  playHref = "/play",
}: Props) {
  const { t, locale } = useTranslation();
  const win = outcome === "SOLVED";
  const streakBroken = !win && previousStreak > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={t("common.back")}
            className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gotd-result-title"
            initial={{ y: 48, opacity: 0.9, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={[
              "relative z-10 mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] w-full max-w-sm overflow-hidden rounded-bubble-xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:mb-0",
              win
                ? "border border-amber-400/35 bg-[#141c24]"
                : "border border-rose-400/30 bg-[#141c24]",
            ].join(" ")}
          >
            <div
              className={[
                "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ring-1",
                win
                  ? "bg-amber-400/20 ring-amber-300/45"
                  : "bg-rose-500/20 ring-rose-400/40",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={win ? "/icons/coin.png" : "/icons/broken-heart.png"}
                alt=""
                draggable={false}
                className="h-8 w-8 object-contain"
              />
            </div>

            <h2
              id="gotd-result-title"
              className="text-center font-display text-xl font-black text-white"
            >
              {win
                ? t("gotd.winTitle")
                : streakBroken
                  ? t("gotd.streakBrokenTitle")
                  : t("gotd.loseTitle")}
            </h2>
            <p className="mt-1 text-center font-display text-sm font-bold text-white/55">
              {win
                ? t(
                    kind === "mystery"
                      ? "gotd.winBodyMystery"
                      : kind === "grid"
                        ? "gotd.winBodyGrid"
                        : "gotd.winBodyStarPath",
                  )
                : streakBroken
                  ? t("gotd.streakBrokenBody", {
                      n: toLocaleDigits(previousStreak, locale),
                    })
                  : t("gotd.loseBody")}
            </p>

            {win && rewards && (
              <div className="mt-4 space-y-2 rounded-2xl bg-black/35 p-3 ring-1 ring-white/10">
                <RewardLine
                  label={t("gotd.baseCoins")}
                  value={`+${toLocaleDigits(rewards.baseCoins, locale)}`}
                  gold
                />
                {rewards.streakBonus > 0 && (
                  <RewardLine
                    label={t("gotd.streakBonus", {
                      n: toLocaleDigits(rewards.streakDays, locale),
                      pct: toLocaleDigits(
                        Math.round(rewards.streakMultiplierPerDay * 100),
                        locale,
                      ),
                    })}
                    value={`+${toLocaleDigits(rewards.streakBonus, locale)}`}
                    gold
                  />
                )}
                {rewards.perfectBonus > 0 && (
                  <RewardLine
                    label={t("gotd.perfectBonus")}
                    value={`+${toLocaleDigits(rewards.perfectBonus, locale)}`}
                    gold
                  />
                )}
                <div className="border-t border-white/10 pt-2">
                  <RewardLine
                    label={t("gotd.totalCoins")}
                    value={`+${toLocaleDigits(rewards.coinsEarned, locale)}`}
                    gold
                    bold
                  />
                  <RewardLine
                    label={t("gotd.totalXp")}
                    value={`+${toLocaleDigits(rewards.xpEarned, locale)}`}
                    bold
                  />
                </div>
                {currentStreak > 0 && (
                  <p className="pt-1 text-center font-display text-xs font-bold text-amber-200/90">
                    🔥 {t("gotd.streakNow", {
                      n: toLocaleDigits(currentStreak, locale),
                    })}
                  </p>
                )}
              </div>
            )}

            {win && unlockedBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {unlockedBadges.map((b) => (
                  <span
                    key={b.slug}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 font-display text-[11px] font-bold text-amber-100 ring-1 ring-amber-300/35"
                  >
                    <span>{b.emoji}</span>
                    {locale === "fa" ? b.nameFa : b.nameEn}
                  </span>
                ))}
              </div>
            )}

            {shareCode ? (
              <pre className="mt-4 rounded-2xl bg-black/35 px-3 py-3 text-center font-display text-base leading-relaxed text-white/85 ring-1 ring-white/10">
                {shareCode}
              </pre>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {onShare && shareCode ? (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    onShare();
                  }}
                  className="flex min-h-touch w-full items-center justify-center rounded-2xl bg-white/10 font-display text-base font-extrabold text-white ring-1 ring-white/15"
                >
                  {t("gotd.share")}
                </button>
              ) : null}
              <Link
                href={playHref}
                onClick={() => playSound("click")}
                className={[
                  "flex min-h-touch w-full items-center justify-center rounded-2xl font-display text-base font-extrabold text-white",
                  win
                    ? "bg-amber-500/90 shadow-[0_6px_0_0_rgba(146,64,14,0.9)]"
                    : "bg-rose-500/90 shadow-[0_6px_0_0_rgba(136,19,55,0.9)]",
                ].join(" ")}
              >
                {t("gotd.backPlay")}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RewardLine({
  label,
  value,
  gold,
  bold,
}: {
  label: string;
  value: string;
  gold?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={[
          "font-display text-xs font-bold text-white/60",
          bold ? "text-sm text-white/85" : "",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "font-display text-sm font-black tabular-nums",
          gold
            ? "text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]"
            : "text-sky-200",
          bold ? "text-base" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
