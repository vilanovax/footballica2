"use client";

import Link from "next/link";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { RecentDuelHistory } from "@/components/duel/RecentDuelHistory";
import { DuelInboxBanner } from "@/components/duel/DuelInboxBanner";

type PlayModesProps = {
  /** Recent finished duels (24h / max 5) for Match Day teaser. */
  recentDuels?: DuelSnapshot[];
  inboxCount?: number;
  inboxItems?: DuelInboxItem[];
};

/** Mode picker for Match Day. Client-side so copy follows the active locale. */
export function PlayModes({
  recentDuels = [],
  inboxCount = 0,
  inboxItems = [],
}: PlayModesProps) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="pt-2">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-secondary">
          {t("play.matchDay")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          {t("play.chooseMode")}
        </h1>
      </header>

      <DuelInboxBanner
        count={inboxCount}
        items={inboxItems}
        variant="play"
      />

      <div className="flex flex-col gap-4">
        <Link
          href="/play/penalty"
          className="btn-fantasy btn-fantasy-secondary w-full text-start"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">{t("play.penalty")}</span>
            <span className="text-sm font-semibold opacity-80">
              {t("play.penaltyDesc")}
            </span>
          </span>
        </Link>

        <Link
          href="/play/quick"
          className="btn-fantasy btn-fantasy-primary w-full text-start"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">{t("play.quick")}</span>
            <span className="text-sm font-semibold opacity-80">
              {t("play.quickDesc")}
            </span>
          </span>
        </Link>

        <Link
          href="/play/duel"
          className="btn-fantasy btn-fantasy-accent w-full text-start"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">{t("play.duel")}</span>
            <span className="text-sm font-semibold opacity-80">
              {t("play.duelDesc")}
            </span>
          </span>
        </Link>

        <Link
          href="/play/survival"
          className="btn-fantasy btn-fantasy-secondary w-full text-start"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">{t("play.survival")}</span>
            <span className="text-sm font-semibold opacity-80">
              {t("play.survivalDesc")}
            </span>
          </span>
        </Link>
      </div>

      <RecentDuelHistory history={recentDuels} variant="play" />
    </section>
  );
}
