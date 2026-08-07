"use client";

import type { ReactNode } from "react";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import type { PlayModeEconomy } from "@/lib/play/modeEconomy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { RecentDuelHistory } from "@/components/duel/RecentDuelHistory";
import { DuelInboxBanner } from "@/components/duel/DuelInboxBanner";
import { MatchCard } from "@/components/play/MatchCard";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import { GameChip, GamePanel } from "@/components/ui/game";
import { cn } from "@/lib/utils";

type PlayModesProps = {
  recentDuels?: DuelSnapshot[];
  inboxCount?: number;
  inboxItems?: DuelInboxItem[];
  stamina: number;
  maxStamina: number;
  survivalBest: number;
  modes: Record<"penalty" | "quick" | "survival" | "duel", PlayModeEconomy>;
  /** Live premium challenges — chip on Survival card only. */
  liveChallengeCount?: number;
  /** Streamed Game of the Day slot (Suspense from the server page). */
  gotd?: ReactNode;
};

/**
 * Match Day Phase 1 — Arena Match Cards, Solo / Online groups,
 * economy chips from GameConfig, 1-click CTA + [i] sheet.
 * Challenges live under Survival lobby (`/play/survival`).
 */
export function PlayModes({
  recentDuels = [],
  inboxCount = 0,
  inboxItems = [],
  stamina,
  maxStamina,
  survivalBest,
  modes,
  liveChallengeCount = 0,
  gotd = null,
}: PlayModesProps) {
  const { t, locale } = useTranslation();
  const staminaLow = stamina <= 1;
  const hasDuelTurn = inboxCount > 0;
  const topDuel = inboxItems[0];
  const duelHref = topDuel ? `/play/duel/${topDuel.id}` : "/play/duel";

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <GamePanel tone="emerald" className="p-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              {t("play.chooseMode")}
            </h1>
          </div>
          <GameChip
            tone={staminaLow ? "default" : "emerald"}
            className={cn(
              "gap-1.5 px-2.5 py-1.5 text-base tabular-nums",
              staminaLow && "text-rose-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.5)]",
            )}
            aria-label={t("play.staminaBalance", {
              cur: toLocaleDigits(stamina, locale),
              max: toLocaleDigits(maxStamina, locale),
            })}
          >
            <span
              className={cn(
                "font-display font-black",
                staminaLow ? "text-rose-300" : "text-emerald-200",
              )}
            >
              {toLocaleDigits(stamina, locale)}/
              {toLocaleDigits(maxStamina, locale)}
            </span>
            <ResourceIcon kind="energy" size="md" className="h-7 w-7" />
          </GameChip>
        </div>
      </GamePanel>

      <DuelInboxBanner
        count={inboxCount}
        items={inboxItems}
        variant="play"
      />

      {gotd}

      <div className="flex flex-col gap-2.5">
        <h2 className="px-0.5 font-display text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          {t("play.groupSolo")}
        </h2>
        <MatchCard
          modeId="penalty"
          tone="penalty"
          href="/play/penalty"
          title={t("play.penalty")}
          blurb={t("play.penaltyDesc", {
            n: toLocaleDigits(modes.penalty.questionCount ?? 0, locale),
          })}
          ctaLabel={t("play.ctaStart")}
          economy={modes.penalty}
        />
        <MatchCard
          modeId="quick"
          tone="quick"
          href="/play/quick"
          title={t("play.quick")}
          blurb={t("play.quickDesc")}
          ctaLabel={t("play.ctaStart")}
          economy={modes.quick}
        />
        <MatchCard
          modeId="survival"
          tone="survival"
          href="/play/survival"
          title={t("play.survival")}
          blurb={t("play.survivalDesc")}
          ctaLabel={t("play.ctaSurvival")}
          economy={modes.survival}
          survivalBest={survivalBest}
          liveChallengeCount={liveChallengeCount}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="px-0.5 font-display text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          {t("play.groupOnline")}
        </h2>
        <MatchCard
          modeId="duel"
          tone="duel"
          href={duelHref}
          title={t("play.duel")}
          blurb={
            hasDuelTurn
              ? t("play.duelContinueBlurb", {
                  n: toLocaleDigits(inboxCount, locale),
                  name: topDuel?.rivalName ?? "…",
                  action:
                    topDuel?.action === "defend"
                      ? t("duel.inboxActionDefend")
                      : topDuel?.action === "attack"
                        ? t("duel.inboxActionAttack")
                        : t("duel.inboxActionAct"),
                })
              : t("play.duelDesc")
          }
          ctaLabel={
            hasDuelTurn ? t("play.ctaContinueDuel") : t("play.ctaDuel")
          }
          urgentBadge={hasDuelTurn ? t("play.duelYourTurnBadge") : null}
          economy={modes.duel}
        />
      </div>

      <RecentDuelHistory history={recentDuels} variant="play" />
    </section>
  );
}
