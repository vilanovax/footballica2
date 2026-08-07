"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/player/current";
import {
  isTelegramReady,
  telegramBotUsername,
  telegramDeepLink,
} from "@/lib/push/telegram";

export type TelegramPrefsInput = {
  duelYourTurn?: boolean;
  vaultNearlyFull?: boolean;
  newspaperReady?: boolean;
  staminaFull?: boolean;
  enabled?: boolean;
};

export async function getTelegramStatus(): Promise<{
  configured: boolean;
  linked: boolean;
  botUsername: string | null;
  deepLink: string | null;
  enabled: boolean;
  duelYourTurn: boolean;
  vaultNearlyFull: boolean;
  newspaperReady: boolean;
  staminaFull: boolean;
}> {
  const configured = isTelegramReady() && Boolean(telegramBotUsername());
  const user = await getCurrentUser();
  if (!user) {
    return {
      configured,
      linked: false,
      botUsername: telegramBotUsername(),
      deepLink: null,
      enabled: true,
      duelYourTurn: true,
      vaultNearlyFull: true,
      newspaperReady: true,
      staminaFull: true,
    };
  }

  const link = await prisma.telegramNotifyLink.findUnique({
    where: { userId: user.id },
  });

  return {
    configured,
    linked: Boolean(link),
    botUsername: telegramBotUsername(),
    deepLink: configured ? telegramDeepLink(user.id) : null,
    enabled: link?.enabled ?? true,
    duelYourTurn: link?.duelYourTurn ?? true,
    vaultNearlyFull: link?.vaultNearlyFull ?? true,
    newspaperReady: link?.newspaperReady ?? true,
    staminaFull: link?.staminaFull ?? true,
  };
}

export async function unlinkTelegram(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  await prisma.telegramNotifyLink.deleteMany({ where: { userId: user.id } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateTelegramPrefs(
  prefs: TelegramPrefsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const link = await prisma.telegramNotifyLink.findUnique({
    where: { userId: user.id },
  });
  if (!link) return { ok: false, error: "not_linked" };

  await prisma.telegramNotifyLink.update({
    where: { id: link.id },
    data: {
      ...(prefs.enabled !== undefined ? { enabled: prefs.enabled } : {}),
      ...(prefs.duelYourTurn !== undefined
        ? { duelYourTurn: prefs.duelYourTurn }
        : {}),
      ...(prefs.vaultNearlyFull !== undefined
        ? { vaultNearlyFull: prefs.vaultNearlyFull }
        : {}),
      ...(prefs.newspaperReady !== undefined
        ? { newspaperReady: prefs.newspaperReady }
        : {}),
      ...(prefs.staminaFull !== undefined
        ? { staminaFull: prefs.staminaFull }
        : {}),
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}
