"use client";

type ScoreboardProps = {
  kickNumber: number;
  totalKicks: number;
  goals: number;
};

/** Row of penalty spots: filled = taken, gold = scored. */
export function Scoreboard({ kickNumber, totalKicks, goals }: ScoreboardProps) {
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
          {goals}
          <span className="text-muted-foreground">/{totalKicks}</span>
        </span>
      </div>
    </div>
  );
}
