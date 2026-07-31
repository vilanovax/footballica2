"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/shell/BottomNav";
import { Toaster } from "@/components/ui/sonner";

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * Mobile-first App Shell — main content + fixed bottom navigation.
 * Constrained to max-w-mobile to avoid desktop stretch / horizontal scroll.
 *
 * The `/admin` CMS is a full-width, desktop-first surface and deliberately
 * opts out of the game chrome (no mobile frame, no bottom nav).
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  // Auth + FTUE screens: no bottom nav chrome.
  const bareChrome =
    pathname === "/login" || pathname?.startsWith("/onboarding");

  // Focused match / daily puzzle arenas — hide tab bar for immersion.
  // Exit via in-arena close (X); Play hub keeps the nav.
  const immersivePlay = isImmersivePlayRoute(pathname);
  const fullBleedMood = isFullBleedMoodRoute(pathname);
  const hideNav = bareChrome || immersivePlay;

  return (
    <div
      className={[
        "relative mx-auto flex min-h-dvh w-full max-w-mobile flex-col overflow-x-hidden",
        // Mystery paints edge-to-edge dark — kill Day Match cream behind safe areas.
        fullBleedMood ? "bg-[#0a0f14]" : "",
      ].join(" ")}
    >
      <main
        className={[
          "flex flex-1 flex-col",
          fullBleedMood
            ? "px-0 pt-0 pb-0"
            : [
                "px-4 pt-[max(1rem,env(safe-area-inset-top))]",
                // Extra clearance for floating Play FAB + iOS home indicator.
                hideNav
                  ? immersivePlay
                    ? "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
                    : "pb-8"
                  : "pb-[calc(7.75rem+env(safe-area-inset-bottom,0px))]",
              ].join(" "),
        ].join(" ")}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
      <Toaster position="top-center" />
    </div>
  );
}

/** Active arenas where chrome would break immersion. */
function isImmersivePlayRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/play/mystery")) return true;
  if (pathname.startsWith("/play/grid")) return true;
  if (pathname.startsWith("/play/star-path")) return true;
  if (pathname.startsWith("/play/penalty")) return true;
  if (pathname.startsWith("/play/quick")) return true;
  // Duel detail only — lobby keeps nav.
  if (/^\/play\/duel\/[^/]+/.test(pathname)) return true;
  return false;
}

/**
 * Arenas that paint edge-to-edge dark (no shell inset).
 * Mystery is excluded: content is black, but top/bottom shell margins
 * keep the Day Match game background.
 */
function isFullBleedMoodRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/play/grid")) return true;
  return false;
}
