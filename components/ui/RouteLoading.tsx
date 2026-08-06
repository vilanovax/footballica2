type RouteLoadingProps = {
  /** Optional short label under the ball. */
  label?: string;
};

/**
 * Fantasy route fallback — animated football instead of a spinner (PRD §UI).
 * CSS-only so `loading.tsx` stays out of the Framer Motion graph.
 */
export function RouteLoading({ label }: RouteLoadingProps) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-20"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span
          className="absolute inset-x-5 bottom-1 h-2 animate-pulse rounded-full bg-foreground/15"
          aria-hidden
        />
        <span
          className="relative z-10 text-5xl drop-shadow-md motion-safe:animate-[route-ball_0.9s_cubic-bezier(0.22,1,0.36,1)_infinite]"
          aria-hidden
        >
          ⚽
        </span>
      </div>
      {label ? (
        <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
      <div className="flex w-full max-w-[220px] flex-col gap-2.5" aria-hidden>
        <div className="h-3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted/80" />
        <div className="h-10 animate-pulse rounded-2xl bg-muted/70" />
      </div>
    </div>
  );
}
