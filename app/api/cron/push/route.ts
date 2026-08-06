import { NextResponse } from "next/server";
import { isProduction, secretsEqual } from "@/lib/env";
import {
  scanDuelYourTurnPushes,
  scanVaultNearlyFullPushes,
} from "@/lib/push/scanNotify";

/**
 * Notify-only re-engagement cron (PWA web push).
 * Auth: `Authorization: Bearer $CRON_SECRET`
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
    const [duel, vault] = await Promise.all([
      scanDuelYourTurnPushes(50),
      scanVaultNearlyFullPushes(40),
    ]);
    return NextResponse.json({ ok: true, duel, vault });
  } catch (err) {
    console.error("cron/push failed", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
