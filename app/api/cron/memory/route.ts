import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProduction, secretsEqual } from "@/lib/env";
import { getGameConfig } from "@/lib/game/gameConfig";
import {
  ensureMemorySchedule,
  MEMORY_SCHEDULE_DAYS,
} from "@/lib/memorygotd/jobs";

/**
 * Pre-schedules Memory GotD puzzles for the Tehran week ahead.
 * Does not overwrite existing days. PairCount/timers frozen from GameConfig.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`
 * Local smoke: `?secret=` when NODE_ENV !== production.
 *
 * Optional query: `?days=7` (1–31).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const url = new URL(request.url);
  const querySecret = isProduction() ? null : url.searchParams.get("secret");

  const authorized =
    secretsEqual(bearer, secret) || secretsEqual(querySecret, secret);
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const daysRaw = url.searchParams.get("days");
  const daysParsed = daysRaw ? Number(daysRaw) : MEMORY_SCHEDULE_DAYS;
  const days = Number.isFinite(daysParsed)
    ? Math.min(31, Math.max(1, Math.floor(daysParsed)))
    : MEMORY_SCHEDULE_DAYS;

  try {
    const config = await getGameConfig();
    const stats = await ensureMemorySchedule(prisma, { days, config });
    return NextResponse.json({
      ok: true,
      todayKey: stats.todayKey,
      days: stats.days,
      createdCount: stats.created.length,
      skippedCount: stats.skipped.length,
      created: stats.created,
      skipped: stats.skipped,
    });
  } catch (err) {
    console.error("cron/memory failed", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
