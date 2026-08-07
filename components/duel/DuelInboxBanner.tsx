"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import {
  GameChip,
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";

type DuelInboxBannerProps = {
  count: number;
  items?: DuelInboxItem[];
  /** Compact strip for Match Day vs fuller club card. */
  variant?: "play" | "club";
};

function formatDeadlineLeft(
  iso: string | null,
  locale: "en" | "fa",
  t: (k: string, vars?: Record<string, string>) => string,
): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return t("duel.inboxDeadlineSoon");
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours <= 1) return t("duel.inboxDeadline1h");
  return t("duel.inboxDeadlineHours", {
    n: toLocaleDigits(hours, locale),
  });
}

function actionLine(
  item: DuelInboxItem,
  t: (k: string) => string,
): string {
  if (item.action === "attack") return t("duel.inboxActionAttack");
  if (item.action === "defend") return t("duel.inboxActionDefend");
  return t("duel.inboxActionAct");
}

/**
 * "Your turn" inbox — Arena amber panel matching Club Hub chrome.
 */
export function DuelInboxBanner({
  count,
  items = [],
  variant = "play",
}: DuelInboxBannerProps) {
  const { t, locale } = useTranslation();
  if (count <= 0) return null;

  const top = items[0];
  const href = top ? `/play/duel/${top.id}` : "/play/duel";
  const deadline = top
    ? formatDeadlineLeft(top.turnDeadlineAt, locale, t)
    : null;
  const more = count - 1;
  const isClub = variant === "club";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <GamePanel
        tone={isClub ? "rose" : "amber"}
        className="ring-1 ring-arena-amber/40"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -end-10 top-0 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl"
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />

        <div className="relative flex items-center gap-3 px-3 pt-3">
          <span className="relative shrink-0">
            <GameIconWell size="lg" amber className="h-14 w-14">
              <motion.span
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.4,
                  ease: "easeInOut",
                }}
              >
                <Swords className="h-7 w-7 text-amber-100" aria-hidden />
              </motion.span>
            </GameIconWell>
            <span className="absolute -end-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 font-display text-[11px] font-black text-accent-foreground shadow-[0_2px_0_0_rgba(0,0,0,0.35)] ring-2 ring-arena">
              {toLocaleDigits(Math.min(count, 9), locale)}
              {count > 9 ? "+" : ""}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-black leading-tight text-white drop-shadow-sm">
              {count === 1
                ? t("duel.inboxRivalWaiting")
                : t("duel.inboxRivalWaitingMany", {
                    n: toLocaleDigits(count, locale),
                  })}
            </p>
            {top ? (
              <p className="mt-0.5 truncate font-display text-[11px] font-bold text-white/70">
                {t("duel.inboxVs", { name: top.rivalName })}
                {" · "}
                <span dir="ltr" className="tabular-nums">
                  {toLocaleDigits(top.youScore, locale)}–
                  {toLocaleDigits(top.themScore, locale)}
                </span>
                {" · "}
                {actionLine(top, t)}
              </p>
            ) : null}
            {deadline ? (
              <GameChip tone="amber" className="mt-1 gap-1 px-2 py-0.5 text-[10px]">
                ⏱ {deadline}
              </GameChip>
            ) : null}
          </div>
        </div>

        <div className="relative flex flex-col gap-2 px-3 pb-3 pt-3">
          <Link
            href={href}
            className="game-cta game-cta-accent w-full font-display text-base font-black"
          >
            {t("duel.inboxPlayNow")}
          </Link>
          {more > 0 ? (
            <Link
              href="/play/duel"
              className="flex min-h-10 w-full items-center justify-center font-display text-xs font-black text-amber-100/85 underline-offset-2 hover:underline"
            >
              {t("duel.inboxSeeAll", {
                n: toLocaleDigits(more, locale),
              })}
            </Link>
          ) : (
            <Link
              href="/play/duel"
              className="flex min-h-10 w-full items-center justify-center font-display text-[11px] font-bold text-white/50"
            >
              {t("duel.inboxOpenLobby")}
            </Link>
          )}
        </div>
      </GamePanel>
    </motion.div>
  );
}
