"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import {
  countPublishedFormats,
  syncLiveopsFormatPack,
} from "@/lib/admin/liveopsFormatPack";

export type LiveopsFormatsSnapshot = {
  published: Record<
    "IMAGE" | "CAREER_PATH" | "HIGHER_LOWER" | "REVEAL_IMAGE",
    number
  >;
  packSize: number;
};

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function getLiveopsFormatsSnapshot(): Promise<LiveopsFormatsSnapshot> {
  if (!(await assertAdmin())) {
    return {
      published: {
        IMAGE: 0,
        CAREER_PATH: 0,
        HIGHER_LOWER: 0,
        REVEAL_IMAGE: 0,
      },
      packSize: 0,
    };
  }
  const [{ readFileSync }, { join }] = await Promise.all([
    import("node:fs"),
    import("node:path"),
  ]);
  let packSize = 0;
  try {
    const file = join(process.cwd(), "prisma", "seeds", "format-questions.json");
    const rows = JSON.parse(readFileSync(file, "utf8")) as unknown[];
    packSize = Array.isArray(rows) ? rows.length : 0;
  } catch {
    packSize = 0;
  }
  return {
    published: await countPublishedFormats(prisma),
    packSize,
  };
}

export async function syncLiveopsFormatsAction(): Promise<
  | {
      ok: true;
      upserted: number;
      byType: Record<string, number>;
      published: LiveopsFormatsSnapshot["published"];
    }
  | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  try {
    const stats = await syncLiveopsFormatPack(prisma);
    const published = await countPublishedFormats(prisma);
    revalidatePath("/admin/questions");
    revalidatePath("/admin/settings");
    revalidatePath("/play");
    return {
      ok: true,
      upserted: stats.upserted,
      byType: stats.byType,
      published,
    };
  } catch (err) {
    console.error("[syncLiveopsFormatsAction]", err);
    return { ok: false, error: "sync_failed" };
  }
}
