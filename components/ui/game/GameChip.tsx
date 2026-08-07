import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type GameChipTone = "default" | "emerald" | "amber";

type GameChipProps = ComponentPropsWithoutRef<"span"> & {
  tone?: GameChipTone;
};

const TONE: Record<GameChipTone, string> = {
  default: "game-chip",
  emerald: "game-chip game-chip-emerald",
  amber: "game-chip game-chip-amber",
};

/** Compact status / perk label. */
export function GameChip({
  tone = "default",
  className,
  children,
  ...rest
}: GameChipProps) {
  return (
    <span className={cn(TONE[tone], className)} {...rest}>
      {children}
    </span>
  );
}
