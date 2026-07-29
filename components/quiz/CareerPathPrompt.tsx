"use client";

import { motion } from "framer-motion";
import type { CareerPathPayload } from "@/lib/quiz/formats";

type Props = {
  careerPath: CareerPathPayload;
};

/**
 * CAREER_PATH — ordered club stops with arrows.
 * Logo when present; otherwise a neat name chip.
 */
export function CareerPathPrompt({ careerPath }: Props) {
  const steps = careerPath.steps;

  return (
    <div className="mt-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-max min-w-full items-stretch justify-center gap-1 px-0.5">
        {steps.map((step, i) => (
          <div key={`${step.name}-${i}`} className="flex items-center gap-1">
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 22,
                delay: i * 0.06,
              }}
              className="flex w-[4.75rem] flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-linear-to-b from-[#243044] to-[#141b27] px-1.5 py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.35)] sm:w-[5.5rem]"
            >
              {step.logoUrl ? (
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/35 p-1 ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={step.logoUrl}
                    alt=""
                    draggable={false}
                    className="h-9 w-9 object-contain"
                  />
                </span>
              ) : (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 font-display text-sm font-black text-primary ring-1 ring-primary/35"
                  aria-hidden
                >
                  {initials(step.name)}
                </span>
              )}
              <span className="line-clamp-2 min-h-[2rem] text-center font-display text-[10px] font-extrabold leading-tight text-white/95">
                {step.name}
              </span>
            </motion.div>

            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="shrink-0 px-0.5 font-display text-base font-black text-accent drop-shadow-[0_0_8px_rgba(250,204,21,0.45)]"
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
