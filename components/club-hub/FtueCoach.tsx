"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import { GamePanel } from "@/components/ui/game";
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
      className="pointer-events-auto w-full max-w-mobile"
    >
      <GamePanel tone="amber" className="p-4">
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className="shrink-0"
            aria-hidden
          >
            <AvatarImage
              avatarKey={avatarKey}
              className="h-14 w-14 rounded-full shadow-md ring-2 ring-amber-300/35"
            />
          </motion.div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-amber-200">
              {name}
            </p>
            <p className="mt-1 font-display text-sm font-bold leading-snug text-white">
              {line}
            </p>
          </div>
        </div>

        {cta && (
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0px rgba(251,191,36,0)",
                "0 0 22px 4px rgba(251,191,36,0.55)",
                "0 0 0px rgba(251,191,36,0)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="mt-4 rounded-2xl"
          >
            <Link
              href={cta.href}
              onClick={() => playSound("click")}
              className="game-cta game-cta-accent flex min-h-14 w-full items-center justify-center"
            >
              {cta.label}
            </Link>
          </motion.div>
        )}
      </GamePanel>
    </motion.div>
  );
}
