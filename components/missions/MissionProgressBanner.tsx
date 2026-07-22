"use client";

import { motion } from "framer-motion";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type MissionProgressBannerProps = {
  missions: EvaluateMissionsResult;
  /** Compact strip under match/duel result. */
  className?: string;
};

/**
 * Post-match / post-duel mission pulse — shows what moved and chest-ready.
 */
export function MissionProgressBanner({
  missions,
  className,
}: MissionProgressBannerProps) {
  const { t, locale } = useTranslation();
  const updates = missions.updates ?? [];
  if (updates.length === 0 && !missions.chestReady) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "w-full rounded-bubble-lg border-2 border-secondary/40 bg-secondary/10 px-3 py-3 text-start shadow-fantasy",
        className ?? "",
      ].join(" ")}
    >
      <p className="font-display text-[11px] font-bold uppercase tracking-widest text-secondary">
        {t("missions.eyebrow")}
        {missions.batchIndex != null
          ? ` · ${t("missions.title", {
              n: toLocaleDigits(missions.batchIndex, locale),
            })}`
          : ""}
      </p>

      <ul className="mt-2 flex flex-col gap-1.5">
        {updates.map((u) => {
          const title = locale === "fa" ? u.titleFa : u.titleEn;
          return (
            <li
              key={u.missionId}
              className="flex items-center justify-between gap-2 font-display text-sm font-bold text-foreground"
            >
              <span className="min-w-0 truncate">
                {u.justCompleted ? "✓ " : ""}
                {title}
              </span>
              <span
                className={[
                  "shrink-0 tabular-nums text-xs",
                  u.justCompleted ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              >
                {u.justCompleted
                  ? t("missions.readyToClaim")
                  : `${toLocaleDigits(u.progress, locale)}/${toLocaleDigits(u.targetValue, locale)}`}
              </span>
            </li>
          );
        })}
      </ul>

      {updates.some((u) => u.justCompleted) && (
        <p className="mt-2 rounded-full bg-accent/20 px-2.5 py-1 text-center font-display text-xs font-bold text-accent-deep">
          {t("missions.chestReadyNudge")}
        </p>
      )}

      {missions.chestReady && (
        <p className="mt-2 rounded-full bg-accent/20 px-2.5 py-1 text-center font-display text-xs font-bold text-accent-deep">
          {t("missions.chestReadyNudge")}
        </p>
      )}
    </motion.div>
  );
}
