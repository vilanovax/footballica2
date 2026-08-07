/**
 * Design-token helpers for JS (motion, canvas, inline styles).
 * CSS / Tailwind remain the source of truth — see DESIGN.md + app/globals.css.
 */

export const ARENA = {
  bg: "hsl(var(--arena-bg))",
  mid: "hsl(var(--arena-mid))",
  deep: "hsl(var(--arena-deep))",
  fg: "hsl(var(--arena-fg))",
  muted: "hsl(var(--arena-muted))",
  ring: "hsl(var(--arena-ring))",
  amber: "hsl(var(--arena-ring-amber))",
  rose: "hsl(var(--arena-ring-rose))",
  sky: "hsl(var(--arena-ring-sky))",
  success: "hsl(var(--arena-success))",
} as const;

/** Canonical pitch wash stops used before tokens existed — prefer CSS classes. */
export const ARENA_WASH = {
  emerald: "from-arena-deep via-arena-mid to-arena",
  amber: "from-[#3d2a08] via-arena-mid to-arena",
  rose: "from-[#3d1520] via-arena-mid to-arena",
  sky: "from-[#0c2d4a] via-arena-mid to-arena",
} as const;
