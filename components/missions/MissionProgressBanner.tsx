"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";
import { GameChip, GamePanel } from "@/components/ui/game";

type MissionProgressBannerProps = {
  missions: EvaluateMissionsResult;
  className?: string;
  /** Pitch-dark Arena styling for post-match / immersive shells. */
  arena?: boolean;
};

/**
 * Compact post-match mission pulse — game strip, not a form list.
 * Shows up to 3 movers + one chest CTA when ready.
 */
export function MissionProgressBanner({
  missions,
  className,
  arena = false,
}: MissionProgressBannerProps) {
  const { t, locale } = useTranslation();
  const updates = missions.updates ?? [];
  if (updates.length === 0 && !missions.chestReady) return null;

  const movers = updates.slice(0, 3);
  const completedCount = updates.filter((u) => u.justCompleted).length;
  const showChest = missions.chestReady || completedCount > 0;

  const title = (
    <>
      {t("missions.eyebrow")}
      {missions.batchIndex != null
        ? ` · ${t("missions.title", {
            n: toLocaleDigits(missions.batchIndex, locale),
          })}`
        : ""}
    </>
  );

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p
          className={[
            "font-display text-[11px] font-bold uppercase tracking-widest",
            arena ? "text-amber-200/85" : "text-secondary",
          ].join(" ")}
        >
          {title}
        </p>
        {completedCount > 0 && (
          arena ? (
            <GameChip tone="emerald" className="text-[10px]">
              ✓ {toLocaleDigits(completedCount, locale)}
            </GameChip>
          ) : (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-extrabold text-primary">
              ✓ {toLocaleDigits(completedCount, locale)}
            </span>
          )
        )}
      </div>

      {movers.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-2">
          {movers.map((u) => {
            const missionTitle = locale === "fa" ? u.titleFa : u.titleEn;
            const pct = Math.min(
              100,
              Math.round((u.progress / Math.max(1, u.targetValue)) * 100),
            );
            return (
              <li key={u.missionId} className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={[
                      "min-w-0 truncate font-display text-sm font-bold",
                      arena ? "text-white" : "text-foreground",
                    ].join(" ")}
                  >
                    {u.justCompleted ? "✓ " : ""}
                    {missionTitle}
                  </span>
                  <span
                    className={[
                      "shrink-0 font-display text-[11px] font-extrabold tabular-nums",
                      u.justCompleted
                        ? arena
                          ? "text-emerald-300"
                          : "text-primary"
                        : arena
                          ? "text-white/50"
                          : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {u.justCompleted
                      ? t("missions.justDone")
                      : `${toLocaleDigits(u.progress, locale)}/${toLocaleDigits(u.targetValue, locale)}`}
                  </span>
                </div>
                <div
                  className={[
                    "mt-1 h-1.5 overflow-hidden rounded-full",
                    arena
                      ? "bg-black/40 ring-1 ring-white/10"
                      : "bg-muted",
                  ].join(" ")}
                >
                  <motion.div
                    className={[
                      "h-full rounded-full",
                      u.justCompleted
                        ? arena
                          ? "bg-emerald-400"
                          : "bg-primary"
                        : "bg-linear-to-r from-amber-400 to-emerald-400",
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
          className={[
            "mt-3 flex min-h-11 w-full items-center justify-center gap-2 font-display text-sm font-extrabold transition-transform active:scale-[0.98]",
            arena
              ? "game-cta game-cta-accent"
              : "rounded-2xl bg-accent/90 px-3 py-2.5 text-accent-foreground shadow-fantasy-sm",
          ].join(" ")}
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
          <span className="font-bold opacity-90">
            → {t("missions.openDrawer")}
          </span>
        </Link>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className ?? ""}
    >
      {arena ? (
        <GamePanel tone="amber" className="w-full px-3 py-3 text-start">
          {body}
        </GamePanel>
      ) : (
        <div className="w-full overflow-hidden rounded-bubble-lg bg-linear-to-br from-secondary/20 via-surface to-primary/10 px-3 py-3 text-start shadow-fantasy-sm">
          {body}
        </div>
      )}
    </motion.div>
  );
}
