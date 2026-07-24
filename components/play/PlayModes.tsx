"use client";

import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import type { PlayModeEconomy } from "@/lib/play/modeEconomy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { RecentDuelHistory } from "@/components/duel/RecentDuelHistory";
import { DuelInboxBanner } from "@/components/duel/DuelInboxBanner";
import { MatchCard } from "@/components/play/MatchCard";

type PlayModesProps = {
  recentDuels?: DuelSnapshot[];
  inboxCount?: number;
  inboxItems?: DuelInboxItem[];
  stamina: number;
  maxStamina: number;
  survivalBest: number;
  modes: Record<"penalty" | "quick" | "survival" | "duel", PlayModeEconomy>;
};

/**
 * Match Day Phase 1 — tinted Match Cards, Solo / Online groups,
 * economy chips from GameConfig, 1-click CTA + [i] sheet.
 */
export function PlayModes({
  recentDuels = [],
  inboxCount = 0,
  inboxItems = [],
  stamina,
  maxStamina,
  survivalBest,
  modes,
}: PlayModesProps) {
  const { t, locale } = useTranslation();
  const staminaLow = stamina <= 1;
  const hasDuelTurn = inboxCount > 0;
  const topDuel = inboxItems[0];
  const duelHref = topDuel ? `/play/duel/${topDuel.id}` : "/play/duel";

  return (
    <section className="flex flex-1 flex-col gap-5 pb-4">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("play.chooseMode")}
          </h1>
        </div>
        <div
          className={[
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-fantasy-sm",
            staminaLow
              ? "border-destructive/40 bg-destructive/10"
              : "border-primary/30 bg-primary/10",
          ].join(" ")}
          aria-label={t("play.staminaBalance", {
            cur: toLocaleDigits(stamina, locale),
            max: toLocaleDigits(maxStamina, locale),
          })}
        >
          <span aria-hidden>⚡</span>
          <span
            className={[
              "font-display text-sm font-bold tabular-nums",
              staminaLow ? "text-destructive" : "text-primary",
            ].join(" ")}
          >
            {toLocaleDigits(stamina, locale)}/
            {toLocaleDigits(maxStamina, locale)}
          </span>
        </div>
      </header>

      <DuelInboxBanner
        count={inboxCount}
        items={inboxItems}
        variant="play"
      />

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
                })
              : t("play.duelDesc")
          }
          ctaLabel={
            hasDuelTurn ? t("play.ctaContinueDuel") : t("play.ctaDuel")
          }
          economy={modes.duel}
        />
      </div>

      <RecentDuelHistory history={recentDuels} variant="play" />
    </section>
  );
}
