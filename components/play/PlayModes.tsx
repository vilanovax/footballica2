"use client";

import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import type { PlayModeEconomy } from "@/lib/play/modeEconomy";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { RecentDuelHistory } from "@/components/duel/RecentDuelHistory";
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
 * Match Day — hierarchy: stamina + one featured mode, then compact solos,
 * then online. Body tap = info; CTA = start (no accidental spends).
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
  const continueHref = topDuel ? `/play/duel/${topDuel.id}` : "/play/duel";

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("play.chooseMode")}
          </h1>
        </div>
        <div
          className={[
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5",
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

      {/* Featured: continue duel if your turn, otherwise Quick Match. */}
      {hasDuelTurn ? (
        <MatchCard
          modeId="duel"
          tone="duel"
          variant="featured"
          badge={t("play.featuredActive")}
          href={continueHref}
          title={t("play.duel")}
          blurb={t("play.duelContinueBlurb", {
            n: toLocaleDigits(inboxCount, locale),
            name: topDuel?.rivalName ?? "…",
          })}
          ctaLabel={t("play.ctaContinueDuel")}
          economy={modes.duel}
        />
      ) : (
        <MatchCard
          modeId="quick"
          tone="quick"
          variant="featured"
          badge={t("play.featuredToday")}
          href="/play/quick"
          title={t("play.quick")}
          blurb={t("play.quickDesc")}
          ctaLabel={t("play.ctaStart")}
          economy={modes.quick}
        />
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
        {/* Quick only in compact list when not already featured */}
        {hasDuelTurn && (
          <MatchCard
            modeId="quick"
            tone="quick"
            href="/play/quick"
            title={t("play.quick")}
            blurb={t("play.quickDesc")}
            ctaLabel={t("play.ctaStart")}
            economy={modes.quick}
          />
        )}
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

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("play.groupOnline")}
        </h2>
        <MatchCard
          modeId="duel"
          tone="duel"
          href="/play/duel"
          title={t("play.duel")}
          blurb={
            hasDuelTurn ? t("play.duelNewBlurb") : t("play.duelDesc")
          }
          ctaLabel={
            hasDuelTurn ? t("play.ctaDuelNew") : t("play.ctaDuel")
          }
          economy={modes.duel}
        />
      </div>

      <RecentDuelHistory history={recentDuels} variant="play" />
    </section>
  );
}
