"use client";

import type { ComponentPropsWithoutRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export type GameCtaVariant = "accent" | "primary" | "ghost" | "danger";

type NativeButton = ComponentPropsWithoutRef<"button">;

type GameCtaProps = Omit<NativeButton, "children"> & {
  variant?: GameCtaVariant;
  children: React.ReactNode;
  /** Full-width sheet footer CTA */
  block?: boolean;
  pressable?: boolean;
};

const VARIANT: Record<GameCtaVariant, string> = {
  accent: "game-cta game-cta-accent",
  primary: "game-cta game-cta-primary",
  ghost: "game-cta game-cta-ghost",
  danger: "game-cta game-cta-danger",
};

/**
 * Pressable arena CTA — amber accent is the default primary action in sheets.
 */
export function GameCta({
  variant = "accent",
  block = false,
  pressable = true,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: GameCtaProps) {
  const classes = cn(
    VARIANT[variant],
    block && "w-full min-h-14",
    className,
  );

  if (pressable && !disabled && variant !== "danger") {
    return (
      <motion.button
        type={type}
        disabled={disabled}
        whileTap={{ y: 3 }}
        className={classes}
        {...(rest as HTMLMotionProps<"button">)}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classes} {...rest}>
      {children}
    </button>
  );
}
