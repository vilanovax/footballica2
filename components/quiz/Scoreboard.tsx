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
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalKicks }).map((_, i) => {
          const taken = i < kickNumber - 1;
          const isCurrent = i === kickNumber - 1;
          return (
            <span
              key={i}
              className={[
                "rounded-full",
                isCurrent
                  ? "h-3 w-3 bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.65)]"
                  : taken
                    ? "h-2.5 w-2.5 bg-emerald-400"
                    : "h-2.5 w-2.5 bg-white/20",
              ].join(" ")}
            />
          );
        })}
      </div>

      <div className="inline-flex items-center gap-1 rounded-xl bg-black/40 px-2 py-1 font-display text-sm font-black tabular-nums text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/trophy.png"
          alt=""
          aria-hidden
          draggable={false}
          className="h-4 w-4 object-contain"
        />
        <span>
          {toLocaleDigits(goals, locale)}
          <span className="text-white/45">
            /{toLocaleDigits(totalKicks, locale)}
          </span>
        </span>
      </div>
    </div>
  );
}
