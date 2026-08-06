import { getDailyMystery } from "@/actions/mystery/getDailyMystery";
import { getDailyGrid } from "@/actions/grid/getDailyGrid";
import { getDailyStarPath } from "@/actions/starpath/getDailyStarPath";
import { getDailyMemory } from "@/actions/memorygotd/getDailyMemory";
import { gameOfTheDayRotation } from "@/lib/grid/gotd";
import type { GameConfig } from "@/lib/game/economy";
import { GameOfTheDayCard } from "@/components/play/GameOfTheDayCard";

type PlayGotdSectionProps = {
  config: GameConfig;
};

/**
 * Async GotD payload — streamed under Suspense on /play so stamina + mode
 * cards paint before the daily puzzle fetch finishes.
 */
export async function PlayGotdSection({ config }: PlayGotdSectionProps) {
  const { kind, rotatesAt } = gameOfTheDayRotation(new Date(), config);

  const [mysteryRes, gridRes, starPathRes, memoryRes] = await Promise.all([
    kind === "mystery" ? getDailyMystery() : Promise.resolve(null),
    kind === "grid" ? getDailyGrid() : Promise.resolve(null),
    kind === "starPath" ? getDailyStarPath() : Promise.resolve(null),
    kind === "memory" ? getDailyMemory() : Promise.resolve(null),
  ]);

  return (
    <GameOfTheDayCard
      mystery={mysteryRes && mysteryRes.ok ? mysteryRes.mystery : null}
      grid={gridRes && gridRes.ok ? gridRes.grid : null}
      starPath={
        starPathRes && starPathRes.ok ? starPathRes.starPath : null
      }
      memory={memoryRes && memoryRes.ok ? memoryRes.memory : null}
      config={config}
      rotatesAt={rotatesAt.toISOString()}
    />
  );
}
