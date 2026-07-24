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

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-mobile flex-col overflow-x-hidden">
      <main
        className={[
          "flex flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]",
          // Extra clearance for floating Play FAB + iOS home indicator.
          bareChrome
            ? "pb-8"
            : "pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))]",
        ].join(" ")}
      >
        {children}
      </main>
      {!bareChrome && <BottomNav />}
      <Toaster position="top-center" />
    </div>
  );
}
