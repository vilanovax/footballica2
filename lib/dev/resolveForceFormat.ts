import "server-only";

import { cookies } from "next/headers";
import { isDeployed } from "@/lib/env";
import { parseForceFormat, type ForceFormat } from "@/lib/dev/formatMocks";

/** Local format-mock force from env or `ff_format` cookie. Always null on deploy. */
export async function resolveForceFormat(): Promise<ForceFormat | null> {
  if (isDeployed()) return null;
  const fromEnv = parseForceFormat(process.env.NEXT_PUBLIC_FORCE_FORMAT);
  if (fromEnv) return fromEnv;
  try {
    const jar = await cookies();
    return parseForceFormat(jar.get("ff_format")?.value);
  } catch {
    return null;
  }
}
