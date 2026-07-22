"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { normalizeClubName } from "@/lib/auth/blacklist";
import { STARTER_AVATARS, type AvatarKey } from "@/lib/onboarding/avatars";
import {
  BOT_DIFFICULTIES,
  isBotDifficulty,
  type BotDifficulty,
} from "@/lib/bots/difficulty";
import type { ManagerAvatar as ManagerAvatarEnum } from "@/generated/prisma/client";
import { answerStatsForUsers } from "@/lib/admin/answerStats";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export type AdminBotRow = {
  id: string;
  displayName: string | null;
  clubName: string;
  difficulty: BotDifficulty | null;
  enabled: boolean;
  /** Correct answers / questions answered, e.g. 68/90 */
  answersLabel: string;
  correctAnswers: number;
  questionsAnswered: number;
  matchesPlayed: number;
  duelsPlayed: number;
  createdAt: string;
};

export type AdminUserRow = {
  id: string;
  phone: string | null;
  displayName: string | null;
  clubName: string | null;
  answersLabel: string;
  correctAnswers: number;
  questionsAnswered: number;
  matchesPlayed: number;
  weeklyXp: number;
  createdAt: string;
};

function pickAvatar(): AvatarKey {
  const pool = STARTER_AVATARS;
  return pool[Math.floor(Math.random() * pool.length)]!.key;
}

function randomSuffix(len = 4): string {
  const n = Math.floor(Math.random() * 10 ** len);
  return String(n).padStart(len, "0");
}

async function uniqueBotClubName(prefix: string): Promise<string> {
  const cleanPrefix = prefix.trim() || "Bot_";
  for (let attempt = 0; attempt < 40; attempt++) {
    const name = `${cleanPrefix}${randomSuffix(4)}`;
    const normalized = normalizeClubName(name);
    const taken = await prisma.club.findUnique({
      where: { nameNormalized: normalized },
      select: { id: true },
    });
    if (!taken) return name;
  }
  // Extremely unlikely collision storm — stamp with time.
  return `${cleanPrefix}${Date.now().toString(36).slice(-6)}`;
}

export async function listAdminBots(): Promise<AdminBotRow[]> {
  if (!(await assertAdmin())) return [];

  const bots = await prisma.user.findMany({
    where: { isBot: true },
    include: {
      club: { select: { name: true, matchesPlayed: true } },
      _count: {
        select: {
          duelsAsChallenger: true,
          duelsAsOpponent: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const stats = await answerStatsForUsers(bots.map((b) => b.id));

  return bots.map((b) => {
    const s = stats.get(b.id) ?? { correct: 0, total: 0 };
    return {
      id: b.id,
      displayName: b.displayName,
      clubName: b.club?.name ?? b.displayName ?? "—",
      difficulty: b.botDifficulty,
      enabled: b.botEnabled,
      correctAnswers: s.correct,
      questionsAnswered: s.total,
      answersLabel: `${s.correct}/${s.total}`,
      matchesPlayed: b.club?.matchesPlayed ?? 0,
      duelsPlayed: b._count.duelsAsChallenger + b._count.duelsAsOpponent,
      createdAt: b.createdAt.toISOString(),
    };
  });
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  if (!(await assertAdmin())) return [];

  const users = await prisma.user.findMany({
    where: { isBot: false, phone: { not: null } },
    include: {
      club: { select: { name: true, matchesPlayed: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const stats = await answerStatsForUsers(users.map((u) => u.id));

  return users.map((u) => {
    const s = stats.get(u.id) ?? { correct: 0, total: 0 };
    return {
      id: u.id,
      phone: u.phone,
      displayName: u.displayName,
      clubName: u.club?.name ?? null,
      correctAnswers: s.correct,
      questionsAnswered: s.total,
      answersLabel: `${s.correct}/${s.total}`,
      matchesPlayed: u.club?.matchesPlayed ?? 0,
      weeklyXp: u.weeklyXp,
      createdAt: u.createdAt.toISOString(),
    };
  });
}

export type GenerateBotsResult =
  | { ok: true; created: number }
  | {
      ok: false;
      error: "unauthorized" | "invalid_input" | "server_error";
      message?: string;
    };

/**
 * Create N bot managers (+ clubs) for the PvP cold-start pool.
 */
export async function generateBots(
  quantity: number,
  difficulty: string,
  prefix: string,
): Promise<GenerateBotsResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1 || qty > 200) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Quantity must be 1–200.",
    };
  }
  if (!isBotDifficulty(difficulty)) {
    return {
      ok: false,
      error: "invalid_input",
      message: `Difficulty must be one of ${BOT_DIFFICULTIES.join(", ")}.`,
    };
  }
  const cleanPrefix = (prefix ?? "Bot_").trim() || "Bot_";
  if (cleanPrefix.length > 24) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Prefix max 24 characters.",
    };
  }

  try {
    let created = 0;
    for (let i = 0; i < qty; i++) {
      const avatar = pickAvatar();
      const name = await uniqueBotClubName(cleanPrefix);
      const normalized = normalizeClubName(name);

      await prisma.user.create({
        data: {
          isBot: true,
          botEnabled: true,
          botDifficulty: difficulty,
          displayName: name,
          managerAvatar: avatar as ManagerAvatarEnum,
          phone: null,
          club: {
            create: {
              name,
              nameNormalized: normalized,
              avatar,
              tutorialStep: 2,
              // Seed a little history so the lobby doesn't look empty.
              matchesPlayed: Math.floor(Math.random() * 40),
              matchesWon: Math.floor(Math.random() * 20),
            },
          },
        },
      });
      created += 1;
    }

    revalidatePath("/admin/users");
    return { ok: true, created };
  } catch (err) {
    console.error("generateBots failed", err);
    return { ok: false, error: "server_error" };
  }
}

export type BulkRenameResult =
  | { ok: true; updated: number }
  | {
      ok: false;
      error: "unauthorized" | "invalid_input" | "server_error";
      message?: string;
    };

/**
 * Replace a name prefix across all bots (club.name + displayName).
 */
export async function bulkRenameBots(
  oldPrefix: string,
  newPrefix: string,
): Promise<BulkRenameResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  const from = (oldPrefix ?? "").trim();
  const to = (newPrefix ?? "").trim();
  if (!from) {
    return { ok: false, error: "invalid_input", message: "Search prefix required." };
  }
  if (!to) {
    return { ok: false, error: "invalid_input", message: "New prefix required." };
  }
  if (to.length > 24) {
    return { ok: false, error: "invalid_input", message: "New prefix max 24 chars." };
  }

  try {
    const bots = await prisma.user.findMany({
      where: { isBot: true, club: { name: { startsWith: from } } },
      include: { club: true },
      take: 1000,
    });

    let updated = 0;
    for (const bot of bots) {
      if (!bot.club) continue;
      const nextName = bot.club.name.replace(from, to);
      if (nextName === bot.club.name) continue;

      let normalized = normalizeClubName(nextName);
      // Resolve rare collisions after rename.
      const clash = await prisma.club.findFirst({
        where: {
          nameNormalized: normalized,
          NOT: { id: bot.club.id },
        },
        select: { id: true },
      });
      const finalName = clash ? `${nextName}_${randomSuffix(3)}` : nextName;
      normalized = normalizeClubName(finalName);

      await prisma.$transaction([
        prisma.club.update({
          where: { id: bot.club.id },
          data: { name: finalName, nameNormalized: normalized },
        }),
        prisma.user.update({
          where: { id: bot.id },
          data: { displayName: finalName },
        }),
      ]);
      updated += 1;
    }

    revalidatePath("/admin/users");
    return { ok: true, updated };
  } catch (err) {
    console.error("bulkRenameBots failed", err);
    return { ok: false, error: "server_error" };
  }
}

export type RenameBotResult =
  | { ok: true; name: string }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "not_found"
        | "invalid_input"
        | "taken"
        | "server_error";
      message?: string;
    };

/** Rename a single bot (club.name + displayName). */
export async function renameBot(
  id: string,
  rawName: string,
): Promise<RenameBotResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  const name = (rawName ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Name must be at least 2 characters.",
    };
  }
  if (name.length > 32) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Name max 32 characters.",
    };
  }

  try {
    const bot = await prisma.user.findFirst({
      where: { id, isBot: true },
      include: { club: true },
    });
    if (!bot?.club) return { ok: false, error: "not_found" };

    if (bot.club.name === name) {
      return { ok: true, name };
    }

    const normalized = normalizeClubName(name);
    const clash = await prisma.club.findFirst({
      where: {
        nameNormalized: normalized,
        NOT: { id: bot.club.id },
      },
      select: { id: true },
    });
    if (clash) {
      return {
        ok: false,
        error: "taken",
        message: "That name is already taken.",
      };
    }

    await prisma.$transaction([
      prisma.club.update({
        where: { id: bot.club.id },
        data: { name, nameNormalized: normalized },
      }),
      prisma.user.update({
        where: { id: bot.id },
        data: { displayName: name },
      }),
    ]);

    revalidatePath("/admin/users");
    return { ok: true, name };
  } catch (err) {
    console.error("renameBot failed", err);
    return { ok: false, error: "server_error" };
  }
}

export type DeleteBotResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "not_found" | "in_use" | "server_error" };

/** Remove a single bot (blocked if in an active non-terminal duel). */
export async function deleteBot(id: string): Promise<DeleteBotResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  try {
    const bot = await prisma.user.findFirst({
      where: { id, isBot: true },
      select: { id: true },
    });
    if (!bot) return { ok: false, error: "not_found" };

    const active = await prisma.duelMatch.count({
      where: {
        OR: [{ challengerId: id }, { opponentId: id }],
        status: {
          notIn: ["COMPLETED", "EXPIRED", "FORFEIT"],
        },
      },
    });
    if (active > 0) return { ok: false, error: "in_use" };

    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    console.error("deleteBot failed", err);
    return { ok: false, error: "server_error" };
  }
}

export type UpdateBotDifficultyResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "invalid_input" | "not_found" | "server_error" };

export async function updateBotDifficulty(
  id: string,
  difficulty: string,
): Promise<UpdateBotDifficultyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };
  if (!isBotDifficulty(difficulty)) {
    return { ok: false, error: "invalid_input" };
  }

  try {
    const res = await prisma.user.updateMany({
      where: { id, isBot: true },
      data: { botDifficulty: difficulty },
    });
    if (res.count === 0) return { ok: false, error: "not_found" };
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    console.error("updateBotDifficulty failed", err);
    return { ok: false, error: "server_error" };
  }
}

export type SetBotEnabledResult =
  | { ok: true; enabled: boolean }
  | { ok: false; error: "unauthorized" | "not_found" | "server_error" };

/** Enable / disable a bot for matchmaking (soft kill-switch). */
export async function setBotEnabled(
  id: string,
  enabled: boolean,
): Promise<SetBotEnabledResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };

  try {
    const res = await prisma.user.updateMany({
      where: { id, isBot: true },
      data: { botEnabled: enabled },
    });
    if (res.count === 0) return { ok: false, error: "not_found" };
    revalidatePath("/admin/users");
    return { ok: true, enabled };
  } catch (err) {
    console.error("setBotEnabled failed", err);
    return { ok: false, error: "server_error" };
  }
}
