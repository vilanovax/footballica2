import { BottomNav } from "@/components/shell/BottomNav";

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * Mobile-first App Shell — main content + fixed bottom navigation.
 * Constrained to max-w-mobile to avoid desktop stretch / horizontal scroll.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-mobile flex-col overflow-x-hidden">
      <main className="flex flex-1 flex-col px-4 pb-nav pt-[max(1rem,env(safe-area-inset-top))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
