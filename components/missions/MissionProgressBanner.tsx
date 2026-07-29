"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";

type MissionProgressBannerProps = {
  missions: EvaluateMissionsResult;
  className?: string;
};

/**
 * Compact post-match mission pulse — game strip, not a form list.
 * Shows up to 3 movers + one chest CTA when ready.
 */
export function MissionProgressBanner({
  missions,
  className,
}: MissionProgressBannerProps) {
  const { t, locale } = useTranslation();
  const updates = missions.updates ?? [];
  if (updates.length === 0 && !missions.chestReady) return null;

  const movers = updates.slice(0, 3);
  const completedCount = updates.filter((u) => u.justCompleted).length;
  const showChest = missions.chestReady || completedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "w-full overflow-hidden rounded-bubble-lg bg-linear-to-br from-secondary/20 via-surface to-primary/10 px-3 py-3 text-start shadow-fantasy-sm",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[11px] font-bold uppercase tracking-widest text-secondary">
          {t("missions.eyebrow")}
          {missions.batchIndex != null
            ? ` · ${t("missions.title", {
                n: toLocaleDigits(missions.batchIndex, locale),
              })}`
            : ""}
        </p>
        {completedCount > 0 && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-extrabold text-primary">
            ✓ {toLocaleDigits(completedCount, locale)}
          </span>
        )}
      </div>

      {movers.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-2">
          {movers.map((u) => {
            const title = locale === "fa" ? u.titleFa : u.titleEn;
            const pct = Math.min(
              100,
              Math.round((u.progress / Math.max(1, u.targetValue)) * 100),
            );
            return (
              <li key={u.missionId} className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-display text-sm font-bold text-foreground">
                    {u.justCompleted ? "✓ " : ""}
                    {title}
                  </span>
                  <span
                    className={[
                      "shrink-0 font-display text-[11px] font-extrabold tabular-nums",
                      u.justCompleted
                        ? "text-primary"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {u.justCompleted
                      ? t("missions.justDone")
                      : `${toLocaleDigits(u.progress, locale)}/${toLocaleDigits(u.targetValue, locale)}`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={[
                      "h-full rounded-full",
                      u.justCompleted
                        ? "bg-primary"
                        : "bg-linear-to-r from-secondary to-primary",
                    ].join(" ")}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showChest && (
        <Link
          href="/club"
          onClick={() => playSound("click")}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent/90 px-3 py-2.5 font-display text-sm font-extrabold text-accent-foreground shadow-fantasy-sm transition-transform active:scale-[0.98]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/gift.png"
            alt=""
            aria-hidden
            draggable={false}
            className="h-7 w-7 object-contain"
          />
          {t("missions.chestReadyBadge")}
          <span className="font-bold opacity-90">→ {t("missions.openDrawer")}</span>
        </Link>
      )}
    </motion.div>
  );
}
