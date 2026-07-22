"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

const MAX_GRANT = 1_000_000;
const MIN_GRANT = 1;
const MAX_REASON_LEN = 200;

export type GrantCoinsResult =
  | { ok: true; coins: number; granted: number }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "invalid_amount"
        | "no_club"
        | "not_found"
        | "server_error";
    };

/**
 * Manually credit soft currency to a player's club.
 * Session must be admin. Does NOT touch PurchaseLog (IAP-only).
 */
export async function grantCoinsToUser(
  userId: string,
  amountRaw: number,
  reasonRaw?: string,
): Promise<GrantCoinsResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  const amount = Math.floor(Number(amountRaw));
  if (
    !Number.isFinite(amount) ||
    amount < MIN_GRANT ||
    amount > MAX_GRANT
  ) {
    return { ok: false, error: "invalid_amount" };
  }

  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim()
      ? reasonRaw.trim().slice(0, MAX_REASON_LEN)
      : null;

  if (!userId || typeof userId !== "string") {
    return { ok: false, error: "not_found" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { club: { select: { id: true, coins: true } } },
      });
      if (!user || user.isBot) {
        return { ok: false as const, error: "not_found" as const };
      }
      if (!user.club) {
        return { ok: false as const, error: "no_club" as const };
      }

      await tx.adminCoinGrant.create({
        data: {
          clubId: user.club.id,
          amount,
          reason,
        },
      });

      const updated = await tx.club.update({
        where: { id: user.club.id },
        data: { coins: { increment: amount } },
        select: { coins: true },
      });

      return {
        ok: true as const,
        coins: updated.coins,
        granted: amount,
      };
    });

    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath("/admin/users");
    revalidatePath("/club");
    revalidatePath("/shop");
    return { ok: true, coins: result.coins, granted: result.granted };
  } catch (err) {
    console.error("grantCoinsToUser failed", err);
    return { ok: false, error: "server_error" };
  }
}
