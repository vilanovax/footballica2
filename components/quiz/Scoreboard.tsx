"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type ScoreboardProps = {
  kickNumber: number;
  totalKicks: number;
  goals: number;
};

/** Row of penalty spots: filled = taken, gold = scored. */
export function Scoreboard({ kickNumber, totalKicks, goals }: ScoreboardProps) {
  const { locale } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalKicks }).map((_, i) => {
          const taken = i < kickNumber - 1;
          const isCurrent = i === kickNumber - 1;
          return (
            <span
              key={i}
              className={[
                "h-3 w-3 rounded-full border",
                isCurrent
                  ? "border-accent bg-accent shadow-glow-accent"
                  : taken
                    ? "border-primary bg-primary"
                    : "border-border bg-muted",
              ].join(" ")}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1 font-display text-sm font-bold text-foreground">
        <span aria-hidden>⚽️</span>
        <span>
          {toLocaleDigits(goals, locale)}
          <span className="text-muted-foreground">
            /{toLocaleDigits(totalKicks, locale)}
          </span>
        </span>
      </div>
    </div>
  );
}
