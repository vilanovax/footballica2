"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import { playSound } from "@/lib/audio/SoundManager";

type FtueCoachProps = {
  /** Manager avatar key. */
  avatarKey: string;
  /** Localized manager name (eyebrow). */
  name: string;
  /** Localized coach line. */
  line: string;
  /** Optional glowing CTA that routes somewhere (FTUE step 0). */
  cta?: { href: string; label: string };
};

const slideUp = {
  initial: { opacity: 0, y: 50, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 28, scale: 0.96 },
  transition: { type: "spring" as const, stiffness: 320, damping: 26 },
};

/**
 * In-character coach speech bubble used across the FTUE. Slides up from the
 * bottom so interruptions feel premium rather than like a static modal.
 */
export function FtueCoach({ avatarKey, name, line, cta }: FtueCoachProps) {
  return (
    <motion.div
      initial={slideUp.initial}
      animate={slideUp.animate}
      exit={slideUp.exit}
      transition={slideUp.transition}
      className="pointer-events-auto w-full max-w-mobile rounded-bubble border border-accent/40 bg-surface p-4 shadow-fantasy"
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="shrink-0"
          aria-hidden
        >
          <AvatarImage
            avatarKey={avatarKey}
            className="h-14 w-14 rounded-full shadow-fantasy-sm"
          />
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
            onClick={() => playSound("click")}
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
