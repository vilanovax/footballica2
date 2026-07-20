"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type FtueCoachProps = {
  /** Manager avatar emoji. */
  emoji: string;
  /** Localized manager name (eyebrow). */
  name: string;
  /** Localized coach line. */
  line: string;
  /** Optional glowing CTA that routes somewhere (FTUE step 0). */
  cta?: { href: string; label: string };
};

const bubbleSpring = { type: "spring", stiffness: 260, damping: 20 } as const;

/**
 * In-character coach speech bubble used across the FTUE. Renders the chosen
 * manager avatar with an animated dialogue card and (optionally) a glowing
 * call-to-action button. Text is already localized by the caller.
 */
export function FtueCoach({ emoji, name, line, cta }: FtueCoachProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.94 }}
      transition={bubbleSpring}
      className="pointer-events-auto w-full max-w-mobile rounded-bubble border border-accent/40 bg-surface p-4 shadow-fantasy"
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-3xl shadow-fantasy-sm"
          aria-hidden
        >
          {emoji}
        </motion.div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-accent-deep">
            {name}
          </p>
          <p className="mt-1 font-display text-sm font-bold leading-snug text-surface-foreground">
            {line}
          </p>
        </div>
      </div>

      {cta && (
        <motion.div
          animate={{
            boxShadow: [
              "0 0 0px hsl(var(--primary) / 0)",
              "0 0 24px 4px hsl(var(--primary) / 0.7)",
              "0 0 0px hsl(var(--primary) / 0)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="mt-4 rounded-bubble"
        >
          <Link
            href={cta.href}
            className="btn-fantasy btn-fantasy-primary flex w-full items-center justify-center gap-2"
          >
            <span aria-hidden>⚽️</span>
            <span>{cta.label}</span>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
