"use client";

import { motion } from "framer-motion";

const PIECES = ["⚽️", "🎉", "✨", "💰", "🟢", "🟡"];

/** Lightweight emoji confetti burst. Mount on celebrate, unmount after ~1.6s. */
export function Confetti() {
  const items = Array.from({ length: 16 }).map((_, i) => {
    const angle = (Math.PI * (i / 15)) - Math.PI / 2; // fan upward
    const distance = 120 + Math.random() * 120;
    return {
      id: i,
      emoji: PIECES[i % PIECES.length],
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 40,
      rotate: (Math.random() - 0.5) * 540,
      delay: Math.random() * 0.1,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
      {items.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-xl"
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.6, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: p.x,
            y: [0, p.y, p.y + 160],
            scale: [0.6, 1, 0.9],
            rotate: p.rotate,
          }}
          transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}
