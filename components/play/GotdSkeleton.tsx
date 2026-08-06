/**
 * Streaming fallback for the Game of the Day card on /play.
 * CSS pulse only — no Framer — so the shell paints cheaply.
 */
export function GotdSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-bubble-xl border border-border bg-muted/40 p-4 shadow-fantasy-sm"
      role="status"
      aria-busy="true"
      aria-label="Loading game of the day"
    >
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-3/5 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted/80" />
        <div className="mt-1 h-12 animate-pulse rounded-2xl bg-muted/70" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
