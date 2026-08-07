import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type GamePanelTone = "emerald" | "amber" | "rose" | "sky";

type GamePanelProps = ComponentPropsWithoutRef<"div"> & {
  tone?: GamePanelTone;
  /** Diagonal pinstripe wash overlay */
  pinstripe?: boolean;
};

const TONE: Record<GamePanelTone, string> = {
  emerald: "game-panel",
  amber: "game-panel game-panel-amber",
  rose: "game-panel game-panel-rose",
  sky: "game-panel game-panel-sky",
};

/**
 * Standard immersive panel — sheet heroes, hub cards, arena blocks.
 * Prefer this over one-off hex gradients + shadow rings.
 */
export function GamePanel({
  tone = "emerald",
  pinstripe = true,
  className,
  children,
  ...rest
}: GamePanelProps) {
  return (
    <div
      className={cn(TONE[tone], pinstripe && "game-pinstripe", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
