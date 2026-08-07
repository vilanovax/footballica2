import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type GameOfferProps = ComponentPropsWithoutRef<"div">;

/** Amber upgrade / sponsored offer frame with inner pad. */
export function GameOffer({ className, children, ...rest }: GameOfferProps) {
  return (
    <div className={cn("game-offer", className)} {...rest}>
      <div className="game-offer-inner">{children}</div>
    </div>
  );
}
