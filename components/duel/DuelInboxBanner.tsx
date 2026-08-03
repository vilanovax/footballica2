"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { DuelInboxItem } from "@/actions/duel/getInboxCount";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

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
 * "Your turn" inbox — rival is waiting; deep-link straight into the duel.
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <div
        className={[
          "overflow-hidden rounded-bubble-xl border-2 shadow-fantasy",
          variant === "club"
            ? "border-secondary bg-gradient-to-br from-secondary/25 via-secondary/10 to-surface"
            : "border-accent bg-gradient-to-br from-accent/30 via-accent/10 to-surface",
        ].join(" ")}
      >
        <div className="flex items-start gap-3 px-3.5 pb-2 pt-3.5">
          <motion.span
            className="text-4xl"
            aria-hidden
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          >
            ⚔️
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold leading-tight text-foreground">
              {count === 1
                ? t("duel.inboxRivalWaiting")
                : t("duel.inboxRivalWaitingMany", {
                    n: toLocaleDigits(count, locale),
                  })}
            </p>
            {top ? (
              <p className="mt-1 truncate font-body text-sm font-semibold text-muted-foreground">
                {t("duel.inboxVs", { name: top.rivalName })}
                {" · "}
                {toLocaleDigits(top.youScore, locale)}–
                {toLocaleDigits(top.themScore, locale)}
                {" · "}
                {actionLine(top, t)}
              </p>
            ) : null}
            {deadline ? (
              <p className="mt-0.5 font-display text-xs font-bold text-accent-deep">
                ⏱ {deadline}
              </p>
            ) : null}
          </div>
          <span
            className={[
              "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 font-display text-sm font-bold text-white",
              variant === "club" ? "bg-secondary" : "bg-accent",
            ].join(" ")}
            aria-hidden
          >
            {toLocaleDigits(Math.min(count, 9), locale)}
            {count > 9 ? "+" : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/40 bg-surface/70 px-3 py-3 backdrop-blur-sm">
          <Link
            href={href}
            className="btn-fantasy btn-fantasy-accent flex min-h-touch w-full items-center justify-center font-display text-base font-bold"
          >
            {t("duel.inboxPlayNow")}
          </Link>
          {more > 0 ? (
            <Link
              href="/play/duel"
              className="flex min-h-11 w-full items-center justify-center rounded-bubble font-display text-sm font-bold text-secondary underline-offset-2 hover:underline"
            >
              {t("duel.inboxSeeAll", {
                n: toLocaleDigits(more, locale),
              })}
            </Link>
          ) : (
            <Link
              href="/play/duel"
              className="flex min-h-11 w-full items-center justify-center rounded-bubble font-display text-xs font-semibold text-muted-foreground"
            >
              {t("duel.inboxOpenLobby")}
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
