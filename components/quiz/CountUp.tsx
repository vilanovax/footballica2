"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { toLocaleDigits } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";

type CountUpProps = {
  value: number;
  locale: Locale;
  /** Seconds. */
  duration?: number;
  /** Delay before counting starts (seconds). */
  delay?: number;
  /** Prefix shown before the number (e.g. "+"). */
  prefix?: string;
};

/**
 * Animates a number counting up from 0 to `value` for a satisfying reward
 * reveal. Locale-aware (renders Persian numerals in RTL).
 */
export function CountUp({
  value,
  locale,
  duration = 0.9,
  delay = 0,
  prefix = "",
}: CountUpProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, delay]);

  return (
    <>
      {prefix}
      {toLocaleDigits(display, locale)}
    </>
  );
}
