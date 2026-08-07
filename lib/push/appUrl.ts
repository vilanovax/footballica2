import "server-only";

/** Absolute app origin for deep links in Telegram / SMS. */
export function appOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function absoluteAppUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${appOrigin()}${p}`;
}
