"use client";

import { motion } from "framer-motion";
import { AvatarImage } from "@/components/common/AvatarImage";
import { GameCta, GameIconWell, GamePanel } from "@/components/ui/game";
import type { AvatarKey } from "@/lib/onboarding/avatars";

type KeysHandoffProps = {
  avatarKey: AvatarKey;
  managerName: string;
  line: string;
  acceptLabel: string;
  backLabel: string;
  onAccept: () => void;
  onBack: () => void;
};

/**
 * Narrative beat: chosen manager hands over the keys to a ruined club.
 */
export function KeysHandoff({
  avatarKey,
  managerName,
  line,
  acceptLabel,
  backLabel,
  onAccept,
  onBack,
}: KeysHandoffProps) {
  return (
    <div className="flex flex-col gap-4">
      <GamePanel tone="amber" className="relative overflow-hidden p-4">
        {/* Ruined pitch silhouette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 50% 110%, #fbbf24 0%, transparent 55%), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,255,255,0.06) 18px, rgba(255,255,255,0.06) 19px)",
          }}
        />
        <div className="relative flex flex-col items-center gap-3 pt-1">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
            {managerName}
          </p>

          <div className="relative flex h-36 w-full items-end justify-center">
            {/* Cracked stands */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-x-6 bottom-0 h-20 rounded-t-[2rem] bg-linear-to-b from-stone-700/80 to-stone-950/90 ring-1 ring-white/10"
            >
              <div className="absolute inset-x-8 top-3 h-2 rounded-full bg-stone-500/40" />
              <div className="absolute inset-x-12 top-7 h-1.5 rounded-full bg-stone-600/35" />
              <div className="absolute bottom-0 start-1/4 h-10 w-px rotate-12 bg-amber-900/50" />
              <div className="absolute bottom-0 end-1/3 h-12 w-px -rotate-6 bg-amber-900/40" />
            </motion.div>

            {/* Dirt pitch */}
            <motion.div
              aria-hidden
              initial={{ scaleX: 0.85, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="absolute inset-x-10 bottom-0 h-6 rounded-full bg-linear-to-r from-amber-900/50 via-amber-700/40 to-amber-900/50"
            />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
              className="relative z-10"
            >
              <AvatarImage
                avatarKey={avatarKey}
                className="h-20 w-20 rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.35)] ring-2 ring-amber-300/40"
              />
            </motion.div>

            {/* Floating keys */}
            <motion.div
              aria-hidden
              initial={{ y: 8, opacity: 0, rotate: -12 }}
              animate={{ y: [0, -6, 0], opacity: 1, rotate: [-8, 4, -8] }}
              transition={{
                opacity: { delay: 0.45, duration: 0.35 },
                y: { delay: 0.55, duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                rotate: {
                  delay: 0.55,
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              className="absolute end-[18%] top-2 z-20"
            >
              <GameIconWell size="md" amber src="/icons/claim.png" />
            </motion.div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <GameIconWell size="sm" src="/icons/stadium.png" />
            <p className="font-display text-sm font-bold leading-snug text-amber-50">
              {line}
            </p>
          </div>
        </div>
      </GamePanel>

      <GameCta variant="accent" block onClick={onAccept}>
        {acceptLabel}
      </GameCta>
      <button
        type="button"
        onClick={onBack}
        className="min-h-touch font-display text-sm font-bold text-white/55"
      >
        {backLabel}
      </button>
    </div>
  );
}
