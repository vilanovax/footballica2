import "server-only";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_GAME_CONFIG,
  mergeGameConfig,
  type GameConfig,
} from "@/lib/game/economy";

/** Fixed id of the singleton config row. */
export const GAME_CONFIG_ID = "global";

/**
 * Read the effective game config: the DB singleton merged over the defaults.
 * Never throws on a missing/partial row — falls back to `DEFAULT_GAME_CONFIG`.
 */
export async function getGameConfig(): Promise<GameConfig> {
  const row = await prisma.gameConfig
    .findUnique({ where: { id: GAME_CONFIG_ID } })
    .catch(() => null);
  return row ? mergeGameConfig(row.config) : { ...DEFAULT_GAME_CONFIG };
}
