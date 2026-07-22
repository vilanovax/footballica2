import { NextResponse } from "next/server";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { isProduction, secretsEqual } from "@/lib/env";

/**
 * Vercel Cron / external scheduler entry.
 * Auth: `Authorization: Bearer $CRON_SECRET`
 * Local smoke only: `?secret=` is accepted when NODE_ENV !== production.
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

  try {
    const stats = await tickDuelJobs(100);
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error("cron/duels failed", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
