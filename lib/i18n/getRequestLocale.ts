import "server-only";

import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n/localeCookie";

/** Server: active player UI locale (defaults to English). */
export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value);
}
