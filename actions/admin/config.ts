"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { mergeGameConfig, type GameConfig } from "@/lib/game/economy";
import { getGameConfig as readGameConfig, GAME_CONFIG_ID } from "@/lib/game/gameConfig";

export type ConfigResult =
  | { ok: true; config: GameConfig }
  | { ok: false; error: string };

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

/** Current effective config (DB merged over defaults). Safe to call anywhere. */
export async function getGameConfig(): Promise<GameConfig> {
  return readGameConfig();
}

/**
 * Persist a new config. Untrusted input is normalized through `mergeGameConfig`
 * (every field validated + defaulted) before writing the singleton row.
 */
export async function updateGameConfig(raw: unknown): Promise<ConfigResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const config = mergeGameConfig(raw);

  try {
    await prisma.gameConfig.upsert({
      where: { id: GAME_CONFIG_ID },
      update: { config: config as unknown as Prisma.InputJsonValue },
      create: {
        id: GAME_CONFIG_ID,
        config: config as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    return { ok: false, error: "Could not save config." };
  }

  revalidatePath("/admin/config");
  revalidatePath("/admin/modes");
  revalidatePath("/admin");
  revalidatePath("/play");
  return { ok: true, config };
}
