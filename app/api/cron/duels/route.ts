import { NextResponse } from "next/server";
import { tickDuelJobs } from "@/lib/duel/jobs";

/**
 * Vercel Cron / external scheduler entry.
 * Auth: `Authorization: Bearer $CRON_SECRET` (or `?secret=` in local smoke).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  if (bearer !== secret && querySecret !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const stats = await tickDuelJobs(100);
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error("cron/duels failed", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
