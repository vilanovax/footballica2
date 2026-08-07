import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type GameIconWellProps = ComponentPropsWithoutRef<"span"> & {
  size?: "sm" | "md" | "lg" | "xl";
  amber?: boolean;
  src?: string;
  /** Icon pixel size when `src` is set */
  iconClassName?: string;
};

const SIZE: Record<NonNullable<GameIconWellProps["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-20 w-20 rounded-full",
};

const ICON: Record<NonNullable<GameIconWellProps["size"]>, string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-11 w-11",
};

/** Rounded icon well — PNG icons preferred over emoji. */
export function GameIconWell({
  size = "md",
  amber = false,
  src,
  iconClassName,
  className,
  children,
  ...rest
}: GameIconWellProps) {
  return (
    <span
      className={cn(
        "game-well",
        amber && "game-well-amber",
        SIZE[size],
        className,
      )}
      aria-hidden={src ? true : undefined}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          className={cn("object-contain", ICON[size], iconClassName)}
        />
      ) : (
        children
      )}
    </span>
  );
}
