"use client";

import { motion } from "framer-motion";
import type { GameConfig } from "@/lib/game/economy";
import { HELPER_KEYS, HELPER_META, type HelperKey } from "@/lib/game/helpers";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type HelperDockProps = {
  /** Live helper costs. */
  helpers: GameConfig["helpers"];
  /** Coins still spendable (startingCoins − coinsSpent). */
  coinsLeft: number;
  /** Helpers already used on the current question. */
  usedThisQuestion: HelperKey[];
  /** Wrong options already removed on the current question. */
  eliminatedCount: number;
  /** Total options in the question (usually 4). */
  optionCount: number;
  /** Spare questions left for Substitution. */
  benchLeft: number;
  /** Disable the whole dock (reveal / paused). */
  disabled: boolean;
  onUse: (key: HelperKey) => void;
};

/**
 * Row of coin-spend helpers shown under the answer options during a match.
 * Each helper is affordable-gated and usable once per question; option-removing
 * helpers also disable when no wrong options remain to remove.
 */
export function HelperDock({
  helpers,
  coinsLeft,
  usedThisQuestion,
  eliminatedCount,
  optionCount,
  benchLeft,
  disabled,
  onUse,
}: HelperDockProps) {
  const { t, locale } = useTranslation();
  const wrongsRemaining = Math.max(0, optionCount - 1 - eliminatedCount);

  return (
    <div className="mt-1">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("quiz.helpers.title")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-display text-[11px] font-bold text-accent-deep">
          💰 {toLocaleDigits(coinsLeft, locale)}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {HELPER_KEYS.map((key) => {
          const meta = HELPER_META[key];
          const cost = helpers[key];
          const used = usedThisQuestion.includes(key);
          const tooPoor = coinsLeft < cost;
          const noWrongsLeft = meta.removes > 0 && wrongsRemaining < meta.removes;
          const noBench = key === "reroll" && benchLeft <= 0;
          const isDisabled = disabled || used || tooPoor || noWrongsLeft || noBench;

          return (
            <motion.button
              key={key}
              type="button"
              disabled={isDisabled}
              whileTap={isDisabled ? undefined : { scale: 0.92, y: 2 }}
              onClick={() => onUse(key)}
              aria-label={`${t(meta.labelKey)} — ${cost}`}
              className={[
                "relative flex flex-col items-center justify-center gap-1 rounded-bubble border-2 border-b-4 px-1 py-2 shadow-fantasy-sm transition-colors",
                used
                  ? "border-primary/40 bg-primary/10"
                  : isDisabled
                    ? "border-border bg-muted opacity-50"
                    : "border-border bg-surface active:border-b-2",
              ].join(" ")}
            >
              <span className="text-xl leading-none" aria-hidden>
                {meta.emoji}
              </span>
              <span className="line-clamp-1 w-full text-center font-display text-[10px] font-bold text-surface-foreground">
                {t(meta.labelKey)}
              </span>
              {used ? (
                <span className="font-display text-[10px] font-bold text-primary">✓</span>
              ) : (
                <span className="inline-flex items-center gap-0.5 font-display text-[10px] font-bold text-accent-deep">
                  💰 {toLocaleDigits(cost, locale)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
