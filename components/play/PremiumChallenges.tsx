"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { unlockRecordChallenge } from "@/actions/challenge/recordChallenge";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

export type PlayChallengeCard = {
  id: string;
  slug: string;
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  unlockCostCoins: number;
  targetScore: number;
  rewardBadgeSlug: string | null;
  rewardBadgeEmoji: string | null;
  categoryIds: string[];
  expiresAt: Date | string | null;
  unlocked: boolean;
  bestScore: number;
  conquered: boolean;
};

type PremiumChallengesProps = {
  challenges: PlayChallengeCard[];
  coins: number;
  variant?: "lobby" | "play";
};

/**
 * Live-Ops challenge cards — chip meta, big trophy, single CTA (Game UI).
 */
export function PremiumChallenges({
  challenges,
  coins,
  variant = "lobby",
}: PremiumChallengesProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (challenges.length === 0) return null;

  function playChallenge(c: PlayChallengeCard) {
    playSound("click");
    haptic(HAPTIC.tap);
    const qs = new URLSearchParams();
    qs.set("challenge", c.id);
    if (c.categoryIds.length === 1) {
      qs.set("category", c.categoryIds[0]!);
    }
    router.push(`/play/survival?${qs.toString()}`);
  }

  function unlock(c: PlayChallengeCard) {
    if (coins < c.unlockCostCoins) {
      toast.error(t("play.challengeNeedCoins"));
      return;
    }
    setPendingId(c.id);
    startTransition(async () => {
      const res = await unlockRecordChallenge(c.id);
      setPendingId(null);
      if (!res.ok) {
        const msg =
          res.error === "not_enough_coins"
            ? t("play.challengeNeedCoins")
            : res.error === "already_unlocked"
              ? t("play.challengeAlready")
              : t("play.challengeUnlockFail");
        toast.error(msg);
        return;
      }
      playSound("upgrade");
      haptic(HAPTIC.goal);
      toast.success(t("play.challengeUnlocked"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {variant === "lobby"
            ? t("survival.lobbyChallenges")
            : t("play.groupChallenges")}
        </h2>
      </div>

      <ul className="flex flex-col gap-3">
        {challenges.map((c) => {
          const title = locale === "fa" ? c.titleFa : c.titleEn;
          const busy = pendingId === c.id;
          const expires =
            c.expiresAt != null ? new Date(c.expiresAt) : null;
          const badge = c.rewardBadgeEmoji ?? "🏆";

          return (
            <motion.li
              key={c.id}
              id={`challenge-${c.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                "scroll-mt-24 overflow-hidden rounded-bubble-xl border-2 p-3.5 shadow-fantasy-sm transition-[box-shadow]",
                c.conquered
                  ? "border-primary/40 bg-linear-to-br from-primary/15 to-surface"
                  : "border-accent/45 bg-linear-to-br from-accent/18 to-surface",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl shadow-fantasy-sm",
                    c.conquered
                      ? "bg-primary/20 drop-shadow-[0_0_10px_rgba(255,215,0,0.55)]"
                      : "bg-accent/25",
                  ].join(" ")}
                  aria-hidden
                >
                  {badge}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-display text-xl font-extrabold leading-tight text-foreground">
                      {title}
                    </h3>
                    {c.conquered ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 font-display text-[10px] font-bold text-primary-foreground">
                        {t("play.challengeDone")}
                      </span>
                    ) : null}
                    {c.unlocked && !c.conquered ? (
                      <span className="rounded-full bg-accent/30 px-2 py-0.5 font-display text-[10px] font-bold text-accent-deep">
                        {t("play.challengeUnlockedBadge")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-display text-xs font-bold text-muted-foreground">
                    🎯 {toLocaleDigits(c.targetScore, locale)}
                    {c.bestScore > 0
                      ? ` · ${t("play.challengeBest", {
                          n: toLocaleDigits(c.bestScore, locale),
                        })}`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Visual economy chips — no invoice rows */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {!c.unlocked ? (
                  <GameChip>🪙 {toLocaleDigits(c.unlockCostCoins, locale)}</GameChip>
                ) : (
                  <GameChip dim>🪙 ✓</GameChip>
                )}
                <GameChip highlight>
                  {badge} {toLocaleDigits(c.targetScore, locale)}
                </GameChip>
                <GameChip>⚡ {toLocaleDigits(1, locale)}</GameChip>
                {expires ? (
                  <GameChip dim>
                    ⏳{" "}
                    {expires.toLocaleDateString(
                      locale === "fa" ? "fa-IR" : "en-GB",
                      { month: "short", day: "numeric" },
                    )}
                  </GameChip>
                ) : null}
              </div>

              <div className="mt-3.5">
                {c.unlocked ? (
                  <button
                    type="button"
                    onClick={() => playChallenge(c)}
                    className="btn-fantasy btn-fantasy-accent w-full min-h-12! py-2.5! text-sm"
                  >
                    {c.conquered
                      ? t("play.challengeReplay")
                      : t("play.challengePlay")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => unlock(c)}
                    className="btn-fantasy btn-fantasy-accent w-full min-h-12! py-2.5! text-sm disabled:opacity-60"
                  >
                    {busy
                      ? t("play.challengeUnlocking")
                      : t("play.challengeUnlockCta", {
                          n: toLocaleDigits(c.unlockCostCoins, locale),
                        })}
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function GameChip({
  children,
  highlight,
  dim,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex min-h-8 items-center rounded-full px-2.5 py-1 font-display text-xs font-extrabold shadow-fantasy-sm",
        highlight
          ? "border border-amber-400/60 bg-amber-100 text-amber-950"
          : dim
            ? "border border-border/60 bg-muted/60 text-muted-foreground"
            : "border border-border/80 bg-surface text-foreground",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
