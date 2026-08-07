"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import { duelViewerOutcome } from "@/lib/duel/history";
import { viewerMatchScore } from "@/lib/duel/matchScore";
import { AvatarImage } from "@/components/common/AvatarImage";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { GameChip, GamePanel } from "@/components/ui/game";
import { cn } from "@/lib/utils";

type RecentDuelHistoryProps = {
  history: DuelSnapshot[];
  /** Compact teaser on Match Day vs fuller lobby list. */
  variant?: "lobby" | "play";
};

/**
 * Finished duels retained for 24h (max 5). Tap opens the scorecard.
 */
export function RecentDuelHistory({
  history,
  variant = "lobby",
}: RecentDuelHistoryProps) {
  const { t, locale } = useTranslation();
  if (history.length === 0) return null;

  const title =
    variant === "play" ? t("play.recentDuels") : t("duel.lobbyHistory");
  const hint =
    variant === "play" ? t("play.recentDuelsHint") : t("duel.lobbyHistoryHint");

  const playChrome = variant === "play";

  return (
    <div
      className={cn(
        "relative z-10 mt-1 flex flex-col gap-2.5 pt-3",
        !playChrome && "border-t border-border/60 pt-4",
      )}
    >
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2
            className={cn(
              "font-display text-[11px] font-black uppercase tracking-widest",
              playChrome
                ? "text-muted-foreground"
                : "tracking-[0.14em] text-muted-foreground",
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mt-0.5 font-display text-[11px] font-bold",
              playChrome
                ? "text-foreground/45"
                : "font-body font-semibold text-muted-foreground",
            )}
          >
            {hint}
          </p>
        </div>
        {playChrome && (
          <Link
            href="/play/duel"
            className="shrink-0 font-display text-xs font-black text-primary underline-offset-2 hover:underline"
          >
            {t("play.seeAllDuels")}
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {history.map((d, i) => (
          <HistoryRow
            key={d.id}
            duel={d}
            index={i}
            locale={locale}
            dark={playChrome}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryRow({
  duel: d,
  index,
  locale,
  dark = false,
}: {
  duel: DuelSnapshot;
  index: number;
  locale: "en" | "fa";
  dark?: boolean;
}) {
  const { t } = useTranslation();
  const outcome = duelViewerOutcome(d);
  const { you, them } = viewerMatchScore(d);
  const themParty =
    d.youAre === "challenger" ? d.opponent : d.challenger;

  const outcomeLabel =
    outcome === "WIN"
      ? t("duel.outcomeWin")
      : outcome === "DRAW"
        ? t("duel.outcomeDraw")
        : t("duel.outcomeLose");

  const chipTone =
    outcome === "WIN" ? "emerald" : outcome === "DRAW" ? "default" : "default";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
    >
      {dark ? (
        <Link href={`/play/duel/${d.id}`}>
          <GamePanel
            tone={
              outcome === "WIN"
                ? "emerald"
                : outcome === "LOSE"
                  ? "rose"
                  : "amber"
            }
            className="flex min-h-12 items-center gap-2.5 px-2.5 py-2 transition-transform active:scale-[0.98]"
          >
            <AvatarImage
              avatarKey={themParty?.avatar}
              className="h-10 w-10 shrink-0 rounded-full ring-2 ring-white/20"
              muted={!themParty?.avatar || outcome === "WIN"}
            />

            <div className="relative min-w-0 flex-1">
              <p className="truncate font-display text-sm font-black text-white">
                {themParty?.name ??
                  (d.isBotOpponent ? t("duel.vsBot") : t("duel.vsRival"))}
              </p>
              <p className="mt-0.5 font-display text-sm font-black tabular-nums text-emerald-200">
                {toLocaleDigits(you, locale)}
                <span className="mx-1 text-white/40">–</span>
                {toLocaleDigits(them, locale)}
              </p>
            </div>

            <GameChip
              tone={chipTone}
              className={cn(
                "shrink-0",
                outcome === "LOSE" && "bg-rose-500/25 text-rose-200",
                outcome === "DRAW" && "bg-white/10 text-white/55",
              )}
            >
              {outcomeLabel}
            </GameChip>
          </GamePanel>
        </Link>
      ) : (
        <Link
          href={`/play/duel/${d.id}`}
          className="flex min-h-12 items-center gap-2.5 rounded-bubble-lg border-2 border-border/70 bg-surface/80 px-2.5 py-2 shadow-fantasy transition-transform active:scale-[0.98]"
        >
          <AvatarImage
            avatarKey={themParty?.avatar}
            className="h-12 w-12 shrink-0 rounded-full ring-2 ring-border"
            muted={!themParty?.avatar || outcome === "WIN"}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-surface-foreground">
              {themParty?.name ??
                (d.isBotOpponent ? t("duel.vsBot") : t("duel.vsRival"))}
            </p>
            <p className="mt-0.5 font-display text-sm font-black tabular-nums text-foreground">
              {toLocaleDigits(you, locale)}
              <span className="mx-1 text-muted-foreground">–</span>
              {toLocaleDigits(them, locale)}
            </p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 font-display text-[11px] font-black",
              outcome === "WIN"
                ? "bg-primary/20 text-primary"
                : outcome === "DRAW"
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/15 text-destructive",
            )}
          >
            {outcomeLabel}
          </span>
        </Link>
      )}
    </motion.div>
  );
}
