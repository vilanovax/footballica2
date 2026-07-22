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

/**
 * "Your turn" inbox — the async-PvP nudge players should never miss.
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        href={href}
        className={[
          "flex min-h-touch items-center gap-3 rounded-bubble-lg border-2 px-3.5 py-3 shadow-fantasy transition-transform active:scale-[0.98]",
          variant === "club"
            ? "border-secondary bg-secondary/15"
            : "border-accent bg-accent/15",
        ].join(" ")}
      >
        <span className="text-3xl" aria-hidden>
          ⚔️
        </span>
        <span className="min-w-0 flex-1 text-start">
          <span className="block font-display text-base font-bold text-foreground">
            {t("duel.inboxBanner", {
              n: toLocaleDigits(count, locale),
            })}
          </span>
          {top ? (
            <span className="block truncate font-body text-xs font-semibold text-muted-foreground">
              {t("duel.inboxVs", { name: top.rivalName })}
              {" · "}
              {toLocaleDigits(top.youScore, locale)}–
              {toLocaleDigits(top.themScore, locale)}
            </span>
          ) : (
            <span className="font-display text-sm font-semibold text-secondary">
              {t("duel.inboxCta")}
            </span>
          )}
        </span>
        <span
          className="flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-2 font-display text-sm font-bold text-secondary-foreground"
          aria-hidden
        >
          {toLocaleDigits(Math.min(count, 9), locale)}
          {count > 9 ? "+" : ""}
        </span>
      </Link>
    </motion.div>
  );
}
