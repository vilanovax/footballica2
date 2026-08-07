"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/player/current";
import { isWebPushReady } from "@/lib/push/webPush";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function getPushPublicKey(): Promise<
  { ok: true; publicKey: string } | { ok: false; error: string }
> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey || !isWebPushReady()) {
    return { ok: false, error: "push_not_configured" };
  }
  return { ok: true, publicKey };
}

export async function getPushStatus(): Promise<{
  ok: true;
  configured: boolean;
  subscribed: boolean;
  duelYourTurn: boolean;
  vaultNearlyFull: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: true,
      configured: isWebPushReady(),
      subscribed: false,
      duelYourTurn: true,
      vaultNearlyFull: true,
    };
  }
  try {
    const sub = await prisma.pushSubscription.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return {
      ok: true,
      configured: isWebPushReady(),
      subscribed: Boolean(sub),
      duelYourTurn: sub?.duelYourTurn ?? true,
      vaultNearlyFull: sub?.vaultNearlyFull ?? true,
    };
  } catch {
    // Table missing / migrate pending — keep Settings usable.
    return {
      ok: true,
      configured: isWebPushReady(),
      subscribed: false,
      duelYourTurn: true,
      vaultNearlyFull: true,
    };
  }
}

export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!isWebPushReady()) return { ok: false, error: "push_not_configured" };

  const endpoint = input.endpoint?.trim();
  const p256dh = input.keys?.p256dh?.trim();
  const auth = input.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: "invalid_subscription" };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh,
      auth,
    },
    update: {
      userId: user.id,
      p256dh,
      auth,
    },
  });

  return { ok: true };
}

export async function removePushSubscription(
  endpoint?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  if (endpoint?.trim()) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint: endpoint.trim() },
    });
  } else {
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
  }
  return { ok: true };
}

export async function updatePushPrefs(input: {
  duelYourTurn?: boolean;
  vaultNearlyFull?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const data: { duelYourTurn?: boolean; vaultNearlyFull?: boolean } = {};
  if (typeof input.duelYourTurn === "boolean") {
    data.duelYourTurn = input.duelYourTurn;
  }
  if (typeof input.vaultNearlyFull === "boolean") {
    data.vaultNearlyFull = input.vaultNearlyFull;
  }
  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.pushSubscription.updateMany({
    where: { userId: user.id },
    data,
  });
  return { ok: true };
}
